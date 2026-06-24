import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import Stripe from "stripe";

export const runtime = "nodejs";

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) throw new Error("STRIPE_SECRET_KEY not configured");
  return new Stripe(key, { apiVersion: "2025-06-16.acacia" as any });
}

export async function POST(req: NextRequest) {
  const sig = req.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();

  if (!sig || !webhookSecret) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 400 });
  }

  let rawBody: string;
  let event: Stripe.Event;

  try {
    rawBody = await req.text();
  } catch (err) {
    console.error("[stripe/webhook] Failed to read request body", err);
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  // ✅ 真正的签名验证 — 防伪造 webhook 事件
  try {
    event = getStripe().webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err) {
    console.error("[stripe/webhook] Signature verification failed", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  try {
    const supabase = getSupabaseAdmin();

    // ✅ 幂等性检查 — 防止重复处理同一事件
    const { data: existingEvent } = await supabase
      .from("stripe_events")
      .select("id, processed")
      .eq("stripe_event_id", event.id)
      .maybeSingle();

    if (existingEvent?.processed) {
      // 事件已处理，直接返回成功（Stripe 期望 200）
      return NextResponse.json({ received: true, deduplicated: true });
    }

    // 记录事件（首次）
    await supabase.from("stripe_events").upsert(
      {
        stripe_event_id: event.id,
        event_type: event.type,
        payload: event as unknown as Record<string, unknown>,
        processed: false,
      },
      { onConflict: "stripe_event_id" }
    );

    // 处理 checkout.session.completed — 用户升级 Pro
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const customerId =
        typeof session.customer === "string"
          ? session.customer
          : session.customer?.id;

      if (customerId) {
        const { data: sub } = await supabase
          .from("subscriptions")
          .select("user_id")
          .eq("stripe_customer_id", customerId)
          .maybeSingle();

        const userId = (sub as Record<string, unknown> | null)?.user_id as
          | string
          | undefined;

        if (userId) {
          await supabase.from("subscriptions").upsert({
            user_id: userId,
            stripe_customer_id: customerId,
            stripe_subscription_id:
              (session.subscription as string) || event.id,
            tier: "pro",
            status: "active",
            current_period_end: null,
          });
          await supabase.from("user_quotas").upsert({
            user_id: userId,
            tier: "pro",
            projects_limit: 50,
            codegen_limit: 500,
            storage_limit_mb: 5000,
          });
        }
      }
    }

    // 处理 customer.subscription.deleted — 降级 Free
    if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId =
        typeof subscription.customer === "string"
          ? subscription.customer
          : subscription.customer?.id;

      if (customerId) {
        const { data: sub } = await supabase
          .from("subscriptions")
          .select("user_id")
          .eq("stripe_customer_id", customerId)
          .maybeSingle();

        const userId = (sub as Record<string, unknown> | null)?.user_id as
          | string
          | undefined;

        if (userId) {
          await supabase
            .from("subscriptions")
            .update({ tier: "free", status: "canceled" })
            .eq("stripe_customer_id", customerId);
          await supabase.from("user_quotas").upsert({
            user_id: userId,
            tier: "free",
            projects_limit: 3,
            codegen_limit: 10,
            storage_limit_mb: 100,
          });
        }
      }
    }

    // 标记已处理
    await supabase
      .from("stripe_events")
      .update({ processed: true })
      .eq("stripe_event_id", event.id);

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("[stripe/webhook] Processing error:", err);
    // 不要向客户端泄露错误详情
    return NextResponse.json(
      { error: "Webhook processing error" },
      { status: 500 }
    );
  }
}
