import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const sig = req.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!sig || !secret) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.text();
    // 简化处理：解析 Stripe event JSON
    const event = JSON.parse(body) as {
      id: string;
      type: string;
      data: { object: { customer?: string; id?: string; current_period_end?: number; status?: string } };
    };

    const supabase = getSupabaseAdmin();

    // 记录事件
    await supabase.from("stripe_events").insert({
      stripe_event_id: event.id,
      event_type: event.type,
      payload: event as unknown as Record<string, unknown>,
    });

    const customerId = event.data.object.customer;

    if (event.type === "checkout.session.completed" && customerId) {
      // 用户完成付费 → 升级 Pro
      const { data: sub } = await supabase.from("subscriptions").select("user_id").eq("stripe_customer_id", customerId).maybeSingle();
      const userId = (sub as Record<string, unknown> | null)?.user_id as string | undefined;
      if (userId) {
        await supabase.from("subscriptions").upsert({
          user_id: userId,
          stripe_customer_id: customerId,
          stripe_subscription_id: event.data.object.id || event.id,
          tier: "pro",
          status: "active",
          current_period_end: event.data.object.current_period_end
            ? new Date(event.data.object.current_period_end * 1000).toISOString()
            : null,
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

    if (event.type === "customer.subscription.deleted" && customerId) {
      // 订阅取消 → 降级 Free
      const { data: sub } = await supabase.from("subscriptions").select("user_id").eq("stripe_customer_id", customerId).maybeSingle();
      const userId = (sub as Record<string, unknown> | null)?.user_id as string | undefined;
      if (userId) {
        await supabase.from("subscriptions").update({ tier: "free", status: "canceled" }).eq("stripe_customer_id", customerId);
        await supabase.from("user_quotas").upsert({ user_id: userId, tier: "free", projects_limit: 3, codegen_limit: 10, storage_limit_mb: 100 });
      }
    }

    // 标记已处理
    await supabase.from("stripe_events").update({ processed: true }).eq("stripe_event_id", event.id);

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("[stripe/webhook]", err);
    return NextResponse.json({ error: "Webhook error" }, { status: 400 });
  }
}
