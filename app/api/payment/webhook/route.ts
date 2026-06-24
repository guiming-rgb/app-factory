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
import {
  parseStripeEvent,
  parseWechatPayNotify,
  transition,
  type PaymentOrder,
} from "@/lib/payment/payment-state-machine";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

/**
 * 通过 payment_intent_id 查找订单
 */
async function findByPaymentIntent(
  paymentIntentId: string
): Promise<PaymentOrder | null> {
  const { data } = await supabaseAdmin()
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

  await supabaseAdmin()
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
    // ── Stripe Webhook ──
    if (contentType.includes("application/json")) {
      const sig = req.headers.get("stripe-signature");
      if (sig) {
        const body = await req.json();
        const parsed = parseStripeEvent(body);

        if (!parsed) {
          return NextResponse.json(
            { received: true, action: "skipped" },
            { status: 200 }
          );
        }

        const order = await findByPaymentIntent(parsed.paymentIntentId);
        if (!order) {
          console.warn(
            `[payment:webhook] 未找到 Stripe 订单: ${parsed.paymentIntentId}`
          );
          return NextResponse.json(
            { error: "order not found" },
            { status: 404 }
          );
        }

        await updateOrderStatus(order, parsed.status);
        console.log(
          `[payment:webhook] Stripe 订单 ${order.id}: ${order.status} → ${parsed.status}`
        );

        return NextResponse.json({ received: true }, { status: 200 });
      }
    }

    // ── 微信支付回调 (XML) ──
    if (
      contentType.includes("application/xml") ||
      contentType.includes("text/xml")
    ) {
      const xml = await req.text();
      const parsed = parseWechatPayNotify(xml);

      if (!parsed) {
        // 微信要求返回 XML 格式的失败响应
        return new NextResponse(
          `<xml><return_code><![CDATA[FAIL]]></return_code><return_msg><![CDATA[parse error]]></return_msg></xml>`,
          { headers: { "content-type": "application/xml" } }
        );
      }

      // 通过 prepay_id 查找
      const { data: order } = await supabaseAdmin()
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
 * GET: 健康检查 + 订单状态查询
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const orderId = url.searchParams.get("order_id");

  if (!orderId) {
    return NextResponse.json({ status: "payment webhook ready" });
  }

  try {
    const { data } = await supabaseAdmin()
      .from("orders")
      .select("id, status, amount, currency, method, paid_at, created_at")
      .eq("id", orderId)
      .single();

    return NextResponse.json(data || { error: "not found" });
  } catch {
    return NextResponse.json({ error: "query failed" }, { status: 500 });
  }
}
