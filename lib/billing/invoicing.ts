// ============================================================
// 发票与 Webhook 处理模块
//
// 从 lib/billing/subscription-service.ts 拆分（P2-13）。
// 依赖：subscriptions.ts, pricing.ts
// ============================================================

import { getSupabaseAdmin } from "@/lib/supabase";
import { createComponentLogger } from "@/lib/logger";
import Stripe from "stripe";
import { getSubscription } from "./subscriptions";
import { HARDCODED_PLANS, getStripePriceId, type BillingInterval } from "./pricing";

const log = createComponentLogger("billing:invoicing");

let _stripe: Stripe | null = null;
function getStripe(): Stripe {
  if (_stripe) return _stripe;
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) throw new Error("STRIPE_SECRET_KEY 未配置");
  _stripe = new Stripe(key, { apiVersion: "2025-06-16.acacia" as any });
  return _stripe;
}
function isStripeConfigured(): boolean { return !!process.env.STRIPE_SECRET_KEY?.trim(); }

// ── Webhook Event Handlers ─────────────────────────────────────

async function handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
  const raw = session as any;
  const workspaceId = raw.metadata?.workspace_id;
  const planId = raw.metadata?.plan_id;
  const subId = typeof raw.subscription === "string" ? raw.subscription : raw.subscription?.id ?? raw.id;
  if (!workspaceId || !planId) { log.warn({ sessionId: raw.id }, "Checkout without workspace_id/plan_id"); return; }
  const customerId = typeof raw.customer === "string" ? raw.customer : raw.customer?.id;
  const supabase = getSupabaseAdmin();
  let periodStart: string | null = null, periodEnd: string | null = null, status: string = "active";
  try {
    const stripeSub = (await getStripe().subscriptions.retrieve(subId)) as any;
    periodStart = stripeSub.current_period_start ? new Date(stripeSub.current_period_start * 1000).toISOString() : null;
    periodEnd = stripeSub.current_period_end ? new Date(stripeSub.current_period_end * 1000).toISOString() : null;
    status = stripeSub.status as string;
  } catch (err) { log.warn({ subscriptionId: subId, error: err }, "Could not retrieve Stripe subscription details"); }
  await supabase.from("workspace_subscriptions").upsert({
    workspace_id: workspaceId, plan_id: planId, status,
    stripe_subscription_id: subId, stripe_customer_id: customerId ?? null,
    current_period_start: periodStart, current_period_end: periodEnd, updated_at: new Date().toISOString(),
  }, { onConflict: "workspace_id" });
  log.info({ workspaceId, planId, subscriptionId: subId }, "[billing] Checkout completed");
}

async function handleInvoicePaid(invoice: Stripe.Invoice): Promise<void> {
  const raw = invoice as any;
  const subscriptionId = raw.subscription as string;
  if (!subscriptionId) return;
  const supabase = getSupabaseAdmin();
  const updateData: Record<string, unknown> = { status: "active", updated_at: new Date().toISOString() };
  if (raw.period_start) updateData.current_period_start = new Date(raw.period_start * 1000).toISOString();
  if (raw.period_end) updateData.current_period_end = new Date(raw.period_end * 1000).toISOString();
  await supabase.from("workspace_subscriptions").update(updateData).eq("stripe_subscription_id", subscriptionId);
  log.info({ subscriptionId }, "[billing] Invoice paid");
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
  const raw = invoice as any;
  const subscriptionId = raw.subscription as string;
  if (!subscriptionId) return;
  await getSupabaseAdmin().from("workspace_subscriptions").update({ status: "past_due", updated_at: new Date().toISOString() }).eq("stripe_subscription_id", subscriptionId);
  log.warn({ subscriptionId }, "[billing] Invoice payment failed");
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
  const raw = subscription as any;
  await getSupabaseAdmin().from("workspace_subscriptions").update({ status: "canceled", plan_id: "free", cancel_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("stripe_subscription_id", raw.id);
  log.info({ subscriptionId: raw.id }, "[billing] Subscription deleted");
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
  const raw = subscription as any;
  const planId = raw.metadata?.plan_id ?? inferPlanFromSubscription(subscription as any);
  await getSupabaseAdmin().from("workspace_subscriptions").update({
    status: raw.status, plan_id: planId,
    current_period_start: raw.current_period_start ? new Date(raw.current_period_start * 1000).toISOString() : null,
    current_period_end: raw.current_period_end ? new Date(raw.current_period_end * 1000).toISOString() : null,
    cancel_at: raw.cancel_at ? new Date(raw.cancel_at * 1000).toISOString() : null,
    updated_at: new Date().toISOString(),
  }).eq("stripe_subscription_id", raw.id);
  log.info({ subscriptionId: raw.id, status: raw.status, planId }, "[billing] Subscription updated");
}

function inferPlanFromSubscription(subscription: any): string {
  try {
    const priceId = subscription.items?.data?.[0]?.price?.id;
    if (!priceId) return "free";
    const intervals: BillingInterval[] = ["monthly", "yearly"];
    for (const plan of HARDCODED_PLANS) {
      for (const interval of intervals) {
        if (getStripePriceId(plan.id, interval) === priceId) return plan.id;
      }
    }
    return "pro";
  } catch { return "free"; }
}

// ── Public API ─────────────────────────────────────────────────

export async function handleStripeWebhook(rawBody: string, sig: string): Promise<{ received: boolean; eventType: string }> {
  const stripe = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!webhookSecret) throw new Error("STRIPE_WEBHOOK_SECRET not configured");
  const event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  const supabase = getSupabaseAdmin();
  const { data: existingEvent } = await supabase.from("stripe_events").select("id, processed").eq("stripe_event_id", event.id).maybeSingle();
  if (existingEvent?.processed) return { received: true, eventType: event.type };
  // ✅ ignoreDuplicates 防止并发时重置 processed 为 false
  await supabase.from("stripe_events").upsert(
    { stripe_event_id: event.id, event_type: event.type, payload: event as unknown as Record<string, unknown>, processed: false },
    { onConflict: "stripe_event_id", ignoreDuplicates: true }
  );
  try {
    switch (event.type) {
      case "checkout.session.completed": await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session); break;
      case "invoice.paid": await handleInvoicePaid(event.data.object as Stripe.Invoice); break;
      case "invoice.payment_failed": await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice); break;
      case "customer.subscription.deleted": await handleSubscriptionDeleted(event.data.object as Stripe.Subscription); break;
      case "customer.subscription.updated": await handleSubscriptionUpdated(event.data.object as Stripe.Subscription); break;
      default: log.debug({ eventType: event.type }, "Unhandled webhook event");
    }
    await supabase.from("stripe_events").update({ processed: true }).eq("stripe_event_id", event.id);
    return { received: true, eventType: event.type };
  } catch (error) { log.error({ eventType: event.type, error }, "Webhook handler error"); throw error; }
}

export async function createPortalSession(workspaceId: string, returnUrl: string): Promise<string> {
  if (!isStripeConfigured()) throw new Error("Stripe is not configured");
  const sub = await getSubscription(workspaceId);
  if (!sub?.stripeCustomerId) throw new Error("No Stripe customer found for this workspace");
  const session = await getStripe().billingPortal.sessions.create({ customer: sub.stripeCustomerId, return_url: returnUrl });
  return session.url;
}
