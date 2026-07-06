/**
 * Q2-M2: 统一支付 Webhook
 *
 * POST /api/payment/webhook
 * 处理 Stripe + 微信支付双通道回调
 *
 * Stripe:   stripe listen → forward to localhost:3000/api/payment/webhook
 * 微信支付:  商户平台配置回调 URL → 本端点
 */
import { NextResponse } from "next/server";
import Stripe from "stripe";
import {
  parseStripeEvent,
  parseWechatPayNotify,
  verifyWechatPayNotifySignature,
  transition,
  type PaymentOrder,
} from "@/lib/payment/payment-state-machine";
import { getSupabaseAdmin } from "@/lib/supabase";

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) throw new Error("STRIPE_SECRET_KEY not configured");
  return new Stripe(key, { apiVersion: "2025-06-16.acacia" as any });
}

/**
 * 通过 payment_intent_id 查找订单
 */
async function findByPaymentIntent(
  paymentIntentId: string
): Promise<PaymentOrder | null> {
  const { data } = await getSupabaseAdmin()
    .from("orders")
    .select("*")
    .eq("stripe_payment_intent_id", paymentIntentId)
    .single();

  if (!data) return null;
  return data as unknown as PaymentOrder;
}

/**
 * 更新订单状态（带状态机校验）
 */
async function updateOrderStatus(
  order: PaymentOrder,
  newStatus: string,
  extra: Record<string, unknown> = {}
): Promise<void> {
  const result = transition(order, newStatus as PaymentOrder["status"]);
  if (!result.ok) {
    console.warn(`[payment:webhook] ${result.error}`);
    return;
  }

  await getSupabaseAdmin()
    .from("orders")
    .update({
      status: result.order.status,
      updated_at: result.order.updatedAt.toISOString(),
      ...(result.order.paidAt ? { paid_at: result.order.paidAt.toISOString() } : {}),
      ...extra,
    })
    .eq("id", order.id);
}

export async function POST(req: Request) {
  const contentType = req.headers.get("content-type") || "";

  try {
    // ── Stripe Webhook (with signature verification) ──
    if (contentType.includes("application/json")) {
      const sig = req.headers.get("stripe-signature");
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();

      if (sig && webhookSecret) {
        // ✅ 真正的签名验证 — 防伪造 webhook 事件
        let rawBody: string;
        let event: Stripe.Event;
        try {
          rawBody = await req.text();
          event = getStripe().webhooks.constructEvent(rawBody, sig, webhookSecret);
        } catch (err) {
          console.error("[payment:webhook] Stripe signature verification failed:", err);
          return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
        }

        const supabase = getSupabaseAdmin();
        await supabase.from("stripe_events").upsert(
          {
            stripe_event_id: event.id,
            event_type: event.type,
            payload: event as unknown as Record<string, unknown>,
            processed: false,
          },
          { onConflict: "stripe_event_id", ignoreDuplicates: true },
        );

        const { data: currentEvent } = await supabase
          .from("stripe_events")
          .select("id, processed")
          .eq("stripe_event_id", event.id)
          .single();

        if (currentEvent?.processed) {
          return NextResponse.json({ received: true, deduplicated: true });
        }

        // Only process checkout.session.completed events
        if (event.type !== "checkout.session.completed") {
          return NextResponse.json({ received: true, action: "skipped" });
        }

        const session = event.data.object as Stripe.Checkout.Session;
        const paymentIntentId =
          typeof session.payment_intent === "string"
            ? session.payment_intent
            : session.payment_intent?.id;

        if (!paymentIntentId) {
          return NextResponse.json(
            { received: true, action: "no_payment_intent" },
            { status: 200 }
          );
        }

        const order = await findByPaymentIntent(paymentIntentId);
        if (!order) {
          console.warn(
            `[payment:webhook] 未找到 Stripe 订单: ${paymentIntentId}`
          );
          return NextResponse.json(
            { error: "order not found" },
            { status: 404 }
          );
        }

        await updateOrderStatus(order, event.type === "checkout.session.completed" ? "paid" : "processing");
        console.log(
          `[payment:webhook] Stripe 订单 ${order.id}: ${order.status} → paid`
        );

        await supabase
          .from("stripe_events")
          .update({ processed: true })
          .eq("stripe_event_id", event.id);

        return NextResponse.json({ received: true }, { status: 200 });
      }

      // No webhook secret configured — reject the request
      if (sig && !webhookSecret) {
        console.error("[payment:webhook] STRIPE_WEBHOOK_SECRET not configured");
        return NextResponse.json(
          { error: "Webhook not configured" },
          { status: 500 }
        );
      }

      // Legacy: no stripe-signature header — 仅允许开发环境使用未验签路径
      // 生产环境拒绝无签名的 JSON 请求，防止伪造支付事件
      if (!sig) {
        console.error("[payment:webhook] 拒绝无 stripe-signature 的 JSON 请求");
        return NextResponse.json(
          { error: "Missing stripe-signature header" },
          { status: 401 }
        );
      }
    }

    // ── 微信支付回调 (XML) ──
    if (
      contentType.includes("application/xml") ||
      contentType.includes("text/xml")
    ) {
      const xml = await req.text();

      if (!verifyWechatPayNotifySignature(xml)) {
        console.error("[payment:webhook] WeChat pay signature verification failed");
        return new NextResponse(
          `<xml><return_code><![CDATA[FAIL]]></return_code><return_msg><![CDATA[invalid signature]]></return_msg></xml>`,
          { headers: { "content-type": "application/xml" }, status: 401 },
        );
      }

      const parsed = parseWechatPayNotify(xml);

      if (!parsed) {
        // 微信要求返回 XML 格式的失败响应
        return new NextResponse(
          `<xml><return_code><![CDATA[FAIL]]></return_code><return_msg><![CDATA[parse error]]></return_msg></xml>`,
          { headers: { "content-type": "application/xml" } }
        );
      }

      // 通过 prepay_id 查找
      const { data: order } = await getSupabaseAdmin()
        .from("orders")
        .select("*")
        .eq("wechat_prepay_id", parsed.prepayId)
        .single();

      if (order) {
        await updateOrderStatus(order as unknown as PaymentOrder, parsed.status, {
          wechat_transaction_id: parsed.transactionId,
        });
      }

      // 微信要求返回 XML 格式的成功响应
      return new NextResponse(
        `<xml><return_code><![CDATA[SUCCESS]]></return_code><return_msg><![CDATA[OK]]></return_msg></xml>`,
        { headers: { "content-type": "application/xml" } }
      );
    }

    // ── 未知内容类型 ──
    return NextResponse.json(
      { error: "unsupported content type" },
      { status: 400 }
    );
  } catch (e) {
    console.error("[payment:webhook] 处理失败:", e);
    return NextResponse.json(
      { error: "internal error" },
      { status: 500 }
    );
  }
}

/**
 * GET: 健康检查（仅此用途，不接受 order_id 参数）
 * 订单状态查询请通过认证的 /api/projects/[id]/orders 端点
 */
export async function GET() {
  return NextResponse.json({ status: "payment webhook ready" });
}
