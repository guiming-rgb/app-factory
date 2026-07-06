// ============================================================
// 订阅管理模块
//
// 从 lib/billing/subscription-service.ts 拆分（P2-13）。
// 依赖：pricing.ts
// ============================================================

import { getSupabaseAdmin } from "@/lib/supabase";
import { createComponentLogger } from "@/lib/logger";
import Stripe from "stripe";
import { getPlanById, getStripePriceId, type BillingInterval } from "./pricing";

const log = createComponentLogger("billing:subscriptions");

// ── Types ─────────────────────────────────────────────────────

export type SubscriptionStatus =
  | "active" | "past_due" | "canceled" | "trialing"
  | "incomplete" | "incomplete_expired" | "unpaid";

export interface WorkspaceSubscription {
  id: string;
  workspaceId: string;
  planId: string;
  status: SubscriptionStatus;
  stripeSubscriptionId: string | null;
  stripeCustomerId: string | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// ── Stripe Client ──────────────────────────────────────────────

let _stripe: Stripe | null = null;

function getStripe(): Stripe {
  if (_stripe) return _stripe;
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) throw new Error("STRIPE_SECRET_KEY 未配置。请在 .env.local 中设置后重试。");
  _stripe = new Stripe(key, { apiVersion: "2025-06-16.acacia" as any });
  return _stripe;
}

function isStripeConfigured(): boolean {
  return !!process.env.STRIPE_SECRET_KEY?.trim();
}

// ── Helpers ────────────────────────────────────────────────────

function mapRowToWorkspaceSubscription(row: Record<string, any>): WorkspaceSubscription {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    planId: row.plan_id,
    status: row.status ?? "active",
    stripeSubscriptionId: row.stripe_subscription_id ?? null,
    stripeCustomerId: row.stripe_customer_id ?? null,
    currentPeriodStart: row.current_period_start ?? null,
    currentPeriodEnd: row.current_period_end ?? null,
    cancelAt: row.cancel_at ?? null,
    createdAt: row.created_at ?? new Date().toISOString(),
    updatedAt: row.updated_at ?? new Date().toISOString(),
  };
}

async function getOrCreateStripeCustomer(workspaceId: string, workspaceName: string): Promise<string> {
  const supabase = getSupabaseAdmin();
  const { data: existingSub } = await supabase
    .from("workspace_subscriptions").select("stripe_customer_id")
    .eq("workspace_id", workspaceId).not("stripe_customer_id", "is", null).maybeSingle();
  if (existingSub?.stripe_customer_id) return existingSub.stripe_customer_id;

  const { data: workspace } = await supabase
    .from("workspaces").select("owner_id").eq("id", workspaceId).single();
  let customerEmail: string | undefined;
  if (workspace?.owner_id) {
    const { data: user } = await supabase.auth.admin.getUserById(workspace.owner_id);
    customerEmail = user?.user?.email ?? undefined;
  }
  const customer = await getStripe().customers.create({
    name: workspaceName, email: customerEmail, metadata: { workspace_id: workspaceId },
  });
  return customer.id;
}

async function upsertFreeSubscription(workspaceId: string): Promise<string> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("workspace_subscriptions").upsert(
      { workspace_id: workspaceId, plan_id: "free", status: "active" },
      { onConflict: "workspace_id" },
    ).select("id").single();
  if (error) { log.error({ workspaceId, error }, "Failed to upsert free subscription"); throw error; }
  return data.id;
}

async function createLocalSubscription(workspaceId: string, planId: string, interval: BillingInterval): Promise<string> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("workspace_subscriptions").upsert(
      {
        workspace_id: workspaceId, plan_id: planId, status: "active",
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(interval === "monthly" ? Date.now() + 30 * 86400000 : Date.now() + 365 * 86400000).toISOString(),
      },
      { onConflict: "workspace_id" },
    ).select("id").single();
  if (error) { log.error({ workspaceId, error }, "Failed to create local subscription"); throw error; }
  return data.id;
}

async function getStripeSubscriptionItemId(stripeSubId: string): Promise<string | null> {
  try {
    const sub = await getStripe().subscriptions.retrieve(stripeSubId);
    return sub.items.data[0]?.id ?? null;
  } catch { return null; }
}

// ── Public API ─────────────────────────────────────────────────

export async function createSubscription(
  workspaceId: string, planId: string, interval: BillingInterval = "monthly",
  options?: { successUrl?: string; cancelUrl?: string },
): Promise<{ checkoutUrl: string; subscriptionId: string }> {
  const supabase = getSupabaseAdmin();
  const { data: workspace, error: wsError } = await supabase
    .from("workspaces").select("id, name, owner_id").eq("id", workspaceId).single();
  if (wsError || !workspace) throw new Error(`Workspace not found: ${workspaceId}`);

  const plan = getPlanById(planId);
  if (!plan) throw new Error(`Invalid plan: ${planId}`);
  if (plan.tier === "free") return { checkoutUrl: "", subscriptionId: await upsertFreeSubscription(workspaceId) };

  if (!isStripeConfigured()) {
    throw new Error(
      "Stripe is not configured. Paid subscriptions require STRIPE_SECRET_KEY.",
    );
  }

  const stripeCustomerId = await getOrCreateStripeCustomer(workspaceId, workspace.name);
  const priceId = getStripePriceId(planId, interval);
  if (!priceId) throw new Error(`Stripe Price ID not configured for ${planId}/${interval}`);

  const session = await getStripe().checkout.sessions.create({
    mode: "subscription", customer: stripeCustomerId,
    line_items: [{ price: priceId, quantity: 1 }],
    metadata: { workspace_id: workspaceId, plan_id: planId, interval },
    success_url: options?.successUrl ?? `${process.env.NEXT_PUBLIC_APP_URL}/app/settings/billing?success=true`,
    cancel_url: options?.cancelUrl ?? `${process.env.NEXT_PUBLIC_APP_URL}/app/settings/billing?canceled=true`,
    subscription_data: { metadata: { workspace_id: workspaceId, plan_id: planId } },
  });
  if (!session.url) throw new Error("[billing] Stripe checkout session created without URL");

  const { data: subRecord, error: insertError } = await supabase
    .from("workspace_subscriptions").upsert(
      { workspace_id: workspaceId, plan_id: planId, status: "incomplete",
        stripe_subscription_id: typeof session.subscription === "string" ? session.subscription : session.subscription?.id ?? null,
        stripe_customer_id: stripeCustomerId },
      { onConflict: "workspace_id" },
    ).select("id").single();
  if (insertError) log.error({ workspaceId, error: insertError }, "Failed to create subscription record");

  return { checkoutUrl: session.url, subscriptionId: subRecord?.id ?? workspaceId };
}

export async function getSubscription(workspaceId: string): Promise<WorkspaceSubscription | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("workspace_subscriptions").select("*").eq("workspace_id", workspaceId).maybeSingle();
  if (error) { log.error({ workspaceId, error }, "Failed to fetch subscription"); return null; }
  if (!data) {
    return { id: `free-${workspaceId}`, workspaceId, planId: "free", status: "active",
      stripeSubscriptionId: null, stripeCustomerId: null, currentPeriodStart: null,
      currentPeriodEnd: null, cancelAt: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  }
  return mapRowToWorkspaceSubscription(data);
}

export async function cancelSubscription(workspaceId: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  const sub = await getSubscription(workspaceId);
  if (!sub || sub.planId === "free") return;
  if (sub.stripeSubscriptionId && isStripeConfigured()) {
    await getStripe().subscriptions.update(sub.stripeSubscriptionId, { cancel_at_period_end: true });
    await supabase.from("workspace_subscriptions").update({ cancel_at: new Date(Date.now() + 30 * 86400000).toISOString(), updated_at: new Date().toISOString() }).eq("workspace_id", workspaceId);
  } else {
    await supabase.from("workspace_subscriptions").update({ status: "canceled", cancel_at: new Date().toISOString(), plan_id: "free", updated_at: new Date().toISOString() }).eq("workspace_id", workspaceId);
  }
}

export async function resumeSubscription(workspaceId: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  const sub = await getSubscription(workspaceId);
  if (!sub) return;
  if (sub.stripeSubscriptionId && isStripeConfigured()) {
    await getStripe().subscriptions.update(sub.stripeSubscriptionId, { cancel_at_period_end: false });
  }
  await supabase.from("workspace_subscriptions").update({ status: "active", cancel_at: null, updated_at: new Date().toISOString() }).eq("workspace_id", workspaceId);
}

export async function changePlan(workspaceId: string, newPlanId: string): Promise<WorkspaceSubscription> {
  const supabase = getSupabaseAdmin();
  const currentSub = await getSubscription(workspaceId);
  if (!currentSub) throw new Error("No existing subscription to change");
  const newPlan = getPlanById(newPlanId);
  if (!newPlan) throw new Error(`Invalid plan: ${newPlanId}`);
  if (currentSub.planId === "free" && newPlan.tier !== "free") throw new Error("Upgrade from free requires createSubscription");
  if (newPlan.tier === "free") { await cancelSubscription(workspaceId); return (await getSubscription(workspaceId))!; }
  if (currentSub.stripeSubscriptionId && isStripeConfigured()) {
    const priceId = getStripePriceId(newPlanId, "monthly");
    if (!priceId) throw new Error(`No Stripe price for ${newPlanId}`);
    await getStripe().subscriptions.update(currentSub.stripeSubscriptionId, {
      items: [{ id: (await getStripeSubscriptionItemId(currentSub.stripeSubscriptionId))!, price: priceId }],
      proration_behavior: "always_invoice",
    });
  }
  const { data, error } = await supabase.from("workspace_subscriptions").update({ plan_id: newPlanId, status: "active", updated_at: new Date().toISOString() }).eq("workspace_id", workspaceId).select("*").single();
  if (error) { log.error({ workspaceId, error }, "Failed to change plan"); throw new Error("Failed to update subscription"); }
  return mapRowToWorkspaceSubscription(data);
}

export async function isFeatureEnabled(workspaceId: string, feature: string): Promise<boolean> {
  const sub = await getSubscription(workspaceId);
  const plan = getPlanById(sub?.planId ?? "free");
  if (!plan) return false;
  const planFeatureMap: Record<string, string[]> = {
    priority_queue: ["pro", "enterprise"], custom_domain: ["pro", "enterprise"],
    remove_watermark: ["pro", "enterprise"], sso: ["enterprise"], white_label: ["enterprise"],
    sla: ["enterprise"], dedicated_support: ["enterprise"],
    unlimited_projects: ["enterprise"], unlimited_members: ["enterprise"],
  };
  const allowedTiers = planFeatureMap[feature];
  if (!allowedTiers) return false;
  return allowedTiers.includes(plan.tier);
}
