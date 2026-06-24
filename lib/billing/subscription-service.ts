// ============================================================
// 订阅与计费核心服务
//
// 提供工作空间级别的 Stripe 订阅管理，包括：
//   - 定价方案查询（硬编码）
//   - 订阅创建 / 取消 / 变更
//   - 用量追踪与额度检查
//   - 基于订阅计划的 Feature Flag 检查
//
// 所有数据库操作使用 getSupabaseAdmin()（Service Role）。
// 不要在后端路由之外的任何地方导入此模块。
// ============================================================

import { getSupabaseAdmin } from "@/lib/supabase";
import { createComponentLogger } from "@/lib/logger";
import Stripe from "stripe";

// ============================================================
// 类型定义
// ============================================================

export type PlanTier = "free" | "pro" | "enterprise";

export type BillingInterval = "monthly" | "yearly";

export interface PricingPlan {
  id: string;
  name: string;
  tier: PlanTier;
  priceMonthly: number; // 单位：分（CNY）
  priceYearly: number; // 单位：分（CNY）
  features: string[];
  limits: {
    projects: number;
    codegenPerMonth: number;
    storageMB: number;
    members: number;
  };
}

export type SubscriptionStatus =
  | "active"
  | "past_due"
  | "canceled"
  | "trialing"
  | "incomplete"
  | "incomplete_expired"
  | "unpaid";

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

export interface UsageMetrics {
  workspaceId: string;
  month: string; // "2026-06"
  codegenCount: number;
  storageBytes: number;
  memberCount: number;
}

export interface UsageCheckResult {
  allowed: boolean;
  current: number;
  limit: number;
  /** 当 allowed=false 时，说明超额的具体原因 */
  reason?: string;
}

export type UsageMetric = "codegen" | "storage" | "members";

// ============================================================
// 定价方案（硬编码 — 生产环境建议从 pricing_plans 表中读取）
// ============================================================

const HARDCODED_PLANS: PricingPlan[] = [
  {
    id: "free",
    name: "Free",
    tier: "free",
    priceMonthly: 0,
    priceYearly: 0,
    features: [
      "最多 3 个项目",
      "每月 10 次代码生成",
      "100MB 存储空间",
      "1 位成员",
    ],
    limits: {
      projects: 3,
      codegenPerMonth: 10,
      storageMB: 100,
      members: 1,
    },
  },
  {
    id: "pro",
    name: "Pro",
    tier: "pro",
    priceMonthly: 9900, // 99 元
    priceYearly: 99000, // 990 元（省 198 元）
    features: [
      "最多 20 个项目",
      "每月 100 次代码生成",
      "1GB 存储空间",
      "最多 5 位成员",
      "优先队列",
      "自定义域名",
      "去除水印",
    ],
    limits: {
      projects: 20,
      codegenPerMonth: 100,
      storageMB: 1024,
      members: 5,
    },
  },
  {
    id: "enterprise",
    name: "Enterprise",
    tier: "enterprise",
    priceMonthly: 49900, // 499 元
    priceYearly: 499000, // 4990 元（省 998 元）
    features: [
      "不限项目数",
      "每月 500 次代码生成",
      "10GB 存储空间",
      "不限成员数",
      "SSO 单点登录",
      "白标定制",
      "SLA 保障",
      "专属技术支持",
    ],
    limits: {
      projects: -1, // 无限制
      codegenPerMonth: 500,
      storageMB: 10240,
      members: -1, // 无限制
    },
  },
];

// ============================================================
// Logger
// ============================================================

const log = createComponentLogger("billing");

// ============================================================
// Stripe 客户端（惰性初始化）
// ============================================================

let _stripe: Stripe | null = null;

function getStripe(): Stripe {
  if (_stripe) return _stripe;
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) {
    throw new Error(
      "STRIPE_SECRET_KEY 未配置。请在 .env.local 中设置后重试。",
    );
  }
  _stripe = new Stripe(key, { apiVersion: "2025-06-16.acacia" as any });
  return _stripe;
}

/** 服务是否配置了 Stripe 密钥（未配置时降级为本地模式） */
function isStripeConfigured(): boolean {
  return !!process.env.STRIPE_SECRET_KEY?.trim();
}

// ============================================================
// Stripe Price ID（按 plan + interval 映射）
// ============================================================

function getStripePriceId(planId: string, interval: BillingInterval): string | null {
  // 从环境变量读取。格式：
  //   STRIPE_PRICE_FREE_MONTHLY
  //   STRIPE_PRICE_PRO_MONTHLY
  //   STRIPE_PRICE_PRO_YEARLY
  //   STRIPE_PRICE_ENTERPRISE_MONTHLY
  //   STRIPE_PRICE_ENTERPRISE_YEARLY
  const key = `STRIPE_PRICE_${planId.toUpperCase()}_${interval.toUpperCase()}`;
  return process.env[key]?.trim() ?? null;
}

// ============================================================
// 帮助函数
// ============================================================

/**
 * 构造 YYYY-MM 格式的月份字符串（基于当前 UTC 时间）。
 */
function currentMonthKey(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/**
 * 将 Stripe Subscription 对象转换为应用的 WorkspaceSubscription 类型。
 */
// ---- 帮助函数（已删除 fromStripeSubscriptionData — Stripe v22 类型不兼容，改用 inline `as any`）

// ============================================================
// 公开 API
// ============================================================

// ---- 定价方案 ----

/**
 * 返回所有可用定价方案。
 * 这总是返回硬编码数据（无需数据库查询）。
 */
export function getPricingPlans(): PricingPlan[] {
  return HARDCODED_PLANS;
}

/**
 * 根据 planId 查找定价方案。
 */
export function getPlanById(planId: string): PricingPlan | undefined {
  return HARDCODED_PLANS.find((p) => p.id === planId);
}

// ---- 订阅管理 ----

/**
 * 创建工作空间的订阅 — 返回 Stripe Checkout Session URL。
 *
 * 流程：
 *   1. 检查 workspace 是否存在
 *   2. 查找定价方案
 *   3. 创建 Stripe Checkout Session（含 metadata）
 *   4. 在 Supabase 中预创建订阅记录（status=incomplete）
 *   5. 返回 checkout URL
 *
 * Free 方案直接激活，无需 Stripe。
 */
export async function createSubscription(
  workspaceId: string,
  planId: string,
  interval: BillingInterval = "monthly",
  options?: { successUrl?: string; cancelUrl?: string },
): Promise<{ checkoutUrl: string; subscriptionId: string }> {
  const supabase = getSupabaseAdmin();

  // 1. 验证 workspace
  const { data: workspace, error: wsError } = await supabase
    .from("workspaces")
    .select("id, name, owner_id")
    .eq("id", workspaceId)
    .single();

  if (wsError || !workspace) {
    throw new Error(`Workspace not found: ${workspaceId}`);
  }

  // 2. 验证 plan
  const plan = getPlanById(planId);
  if (!plan) {
    throw new Error(`Invalid plan: ${planId}`);
  }

  // Free plan 不需要 Stripe
  if (plan.tier === "free") {
    return { checkoutUrl: "", subscriptionId: await upsertFreeSubscription(workspaceId) };
  }

  // 3. Stripe Checkout
  if (!isStripeConfigured()) {
    log.warn(
      { workspaceId, planId },
      "[billing] Stripe 未配置 — 使用本地模式创建订阅",
    );
    return {
      checkoutUrl: "",
      subscriptionId: await createLocalSubscription(workspaceId, planId, interval),
    };
  }

  // 查找或创建 Stripe Customer
  const stripeCustomerId = await getOrCreateStripeCustomer(workspaceId, workspace.name);

  // 创建 Checkout Session
  const priceId = getStripePriceId(planId, interval);
  if (!priceId) {
    throw new Error(
      `Stripe Price ID not configured for ${planId}/${interval}. ` +
      `Set STRIPE_PRICE_${planId.toUpperCase()}_${interval.toUpperCase()} in .env.local`,
    );
  }

  const session = await getStripe().checkout.sessions.create({
    mode: "subscription",
    customer: stripeCustomerId,
    line_items: [{ price: priceId, quantity: 1 }],
    metadata: {
      workspace_id: workspaceId,
      plan_id: planId,
      interval,
    },
    success_url: options?.successUrl ?? `${process.env.NEXT_PUBLIC_APP_URL}/app/settings/billing?success=true`,
    cancel_url: options?.cancelUrl ?? `${process.env.NEXT_PUBLIC_APP_URL}/app/settings/billing?canceled=true`,
    subscription_data: {
      metadata: {
        workspace_id: workspaceId,
        plan_id: planId,
      },
    },
  });

  if (!session.url) {
    throw new Error("[billing] Stripe checkout session created without URL");
  }

  // 预创建订阅记录（status=incomplete，等待 webhook 确认）
  const { data: subRecord, error: insertError } = await supabase
    .from("workspace_subscriptions")
    .upsert(
      {
        workspace_id: workspaceId,
        plan_id: planId,
        status: "incomplete",
        stripe_subscription_id:
          typeof session.subscription === "string"
            ? session.subscription
            : session.subscription?.id ?? null,
        stripe_customer_id: stripeCustomerId,
      },
      { onConflict: "workspace_id" },
    )
    .select("id")
    .single();

  if (insertError) {
    log.error({ workspaceId, error: insertError }, "Failed to create subscription record");
  }

  return {
    checkoutUrl: session.url,
    subscriptionId: subRecord?.id ?? workspaceId,
  };
}

/**
 * 获取工作空间的当前订阅。
 * 如果工作空间没有明确订阅记录，则返回默认 Free 方案订阅。
 */
export async function getSubscription(workspaceId: string): Promise<WorkspaceSubscription | null> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("workspace_subscriptions")
    .select("*")
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (error) {
    log.error({ workspaceId, error }, "Failed to fetch subscription");
    return null;
  }

  if (!data) {
    // 没有订阅记录 → 返回隐式的 Free 订阅
    return {
      id: `free-${workspaceId}`,
      workspaceId,
      planId: "free",
      status: "active",
      stripeSubscriptionId: null,
      stripeCustomerId: null,
      currentPeriodStart: null,
      currentPeriodEnd: null,
      cancelAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  return mapRowToWorkspaceSubscription(data);
}

/**
 * 取消订阅 — 在当期结束时取消（Stripe 模式）或立即取消（本地模式）。
 */
export async function cancelSubscription(workspaceId: string): Promise<void> {
  const supabase = getSupabaseAdmin();

  const sub = await getSubscription(workspaceId);
  if (!sub || sub.planId === "free") {
    // Free 方案没有可取消的订阅
    return;
  }

  if (sub.stripeSubscriptionId && isStripeConfigured()) {
    // Stripe 模式：在周期结束时取消
    await getStripe().subscriptions.update(sub.stripeSubscriptionId, {
      cancel_at_period_end: true,
    });

    await supabase
      .from("workspace_subscriptions")
      .update({
        cancel_at: new Date(
          Date.now() + 30 * 24 * 60 * 60 * 1000,
        ).toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("workspace_id", workspaceId);
  } else {
    // 本地模式：直接标记取消
    await supabase
      .from("workspace_subscriptions")
      .update({
        status: "canceled",
        cancel_at: new Date().toISOString(),
        plan_id: "free",
        updated_at: new Date().toISOString(),
      })
      .eq("workspace_id", workspaceId);
  }
}

/**
 * 在取消之前恢复订阅 — 移除周期结束取消标记。
 */
export async function resumeSubscription(workspaceId: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  const sub = await getSubscription(workspaceId);
  if (!sub) return;

  if (sub.stripeSubscriptionId && isStripeConfigured()) {
    await getStripe().subscriptions.update(sub.stripeSubscriptionId, {
      cancel_at_period_end: false,
    });
  }

  await supabase
    .from("workspace_subscriptions")
    .update({
      status: "active",
      cancel_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("workspace_id", workspaceId);
}

/**
 * 变更方案（按比例结算）。
 * Pro ↔ Enterprise 之间支持按比例升降级。
 */
export async function changePlan(
  workspaceId: string,
  newPlanId: string,
): Promise<WorkspaceSubscription> {
  const supabase = getSupabaseAdmin();

  const currentSub = await getSubscription(workspaceId);
  if (!currentSub) {
    throw new Error("No existing subscription to change");
  }

  const newPlan = getPlanById(newPlanId);
  if (!newPlan) {
    throw new Error(`Invalid plan: ${newPlanId}`);
  }

  // Free → 付费：走 checkout 流程
  if (currentSub.planId === "free" && newPlan.tier !== "free") {
    throw new Error(
      "Upgrade from free requires createSubscription (checkout session). " +
      "Call createSubscription instead of changePlan.",
    );
  }

  // 付费 → Free：取消后降级
  if (newPlan.tier === "free") {
    await cancelSubscription(workspaceId);
    return (await getSubscription(workspaceId))!;
  }

  // 付费 ↔ 付费：Stripe 方案变更
  if (currentSub.stripeSubscriptionId && isStripeConfigured()) {
    const priceId = getStripePriceId(newPlanId, "monthly");
    if (!priceId) {
      throw new Error(`No Stripe price for ${newPlanId}`);
    }

    await getStripe().subscriptions.update(currentSub.stripeSubscriptionId, {
      items: [
        {
          id: (await getStripeSubscriptionItemId(currentSub.stripeSubscriptionId))!,
          price: priceId,
        },
      ],
      proration_behavior: "always_invoice",
    });
  }

  // 更新数据库
  const { data, error } = await supabase
    .from("workspace_subscriptions")
    .update({
      plan_id: newPlanId,
      status: "active",
      updated_at: new Date().toISOString(),
    })
    .eq("workspace_id", workspaceId)
    .select("*")
    .single();

  if (error) {
    log.error({ workspaceId, error }, "Failed to change plan");
    throw new Error("Failed to update subscription");
  }

  return mapRowToWorkspaceSubscription(data);
}

/**
 * 获取 Stripe subscription item ID。每个订阅至少包含一个 item。
 */
async function getStripeSubscriptionItemId(
  stripeSubId: string,
): Promise<string | null> {
  try {
    const sub = await getStripe().subscriptions.retrieve(stripeSubId);
    return sub.items.data[0]?.id ?? null;
  } catch {
    return null;
  }
}

// ---- 用量管理 ----

/**
 * 检查工作空间是否在方案的某项限制之内。
 */
export async function checkUsageLimit(
  workspaceId: string,
  metric: UsageMetric,
): Promise<UsageCheckResult> {
  const sub = await getSubscription(workspaceId);
  const plan = getPlanById(sub?.planId ?? "free") ?? HARDCODED_PLANS[0];
  const limit = getLimitValue(plan.limits, metric);

  const current = await getCurrentUsage(workspaceId, metric);

  // -1 表示无限制
  if (limit === -1) {
    return { allowed: true, current, limit };
  }

  const allowed = current < limit;
  return {
    allowed,
    current,
    limit,
    reason: allowed ? undefined : `${metric} usage (${current}) exceeds plan limit (${limit})`,
  };
}

/**
 * 记录用量事件（由 codegen pipeline 等内部组件调用）。
 */
export async function recordUsage(
  workspaceId: string,
  metric: UsageMetric,
  amount: number = 1,
): Promise<void> {
  const supabase = getSupabaseAdmin();

  await supabase.from("usage_records").insert({
    workspace_id: workspaceId,
    metric,
    amount,
  });
}

/**
 * 获取工作空间指定月份（或当月）的用量汇总。
 */
export async function getUsageReport(
  workspaceId: string,
  month?: string,
): Promise<UsageMetrics> {
  const monthKey = month ?? currentMonthKey();
  const [year, m] = monthKey.split("-").map(Number);
  const startDate = new Date(Date.UTC(year, m - 1, 1));
  const endDate = new Date(Date.UTC(year, m, 1));

  const supabase = getSupabaseAdmin();

  const { data: records } = await supabase
    .from("usage_records")
    .select("metric, amount")
    .eq("workspace_id", workspaceId)
    .gte("recorded_at", startDate.toISOString())
    .lt("recorded_at", endDate.toISOString());

  const codegenCount = (records ?? [])
    .filter((r) => r.metric === "codegen")
    .reduce((sum, r) => sum + (r.amount ?? 0), 0);

  const storageBytes = (records ?? [])
    .filter((r) => r.metric === "storage")
    .reduce((sum, r) => sum + (r.amount ?? 0), 0);

  // memberCount 取最新值（如果有多个记录）
  const memberRecords = (records ?? []).filter((r) => r.metric === "members");
  const memberCount = memberRecords.length > 0
    ? memberRecords[memberRecords.length - 1].amount ?? 0
    : 1;

  return {
    workspaceId,
    month: monthKey,
    codegenCount,
    storageBytes,
    memberCount,
  };
}

/**
 * RBAC 风格的 Feature Flag 检查，基于当前订阅方案。
 */
export async function isFeatureEnabled(
  workspaceId: string,
  feature: string,
): Promise<boolean> {
  const sub = await getSubscription(workspaceId);
  const plan = getPlanById(sub?.planId ?? "free");

  if (!plan) return false;

  const planFeatureMap: Record<string, string[]> = {
    priority_queue: ["pro", "enterprise"],
    custom_domain: ["pro", "enterprise"],
    remove_watermark: ["pro", "enterprise"],
    sso: ["enterprise"],
    white_label: ["enterprise"],
    sla: ["enterprise"],
    dedicated_support: ["enterprise"],
    unlimited_projects: ["enterprise"],
    unlimited_members: ["enterprise"],
  };

  const allowedTiers = planFeatureMap[feature];
  if (!allowedTiers) return false;

  return allowedTiers.includes(plan.tier);
}

// ---- Webhook 处理 ----

/**
 * 处理 Stripe webhook 事件并更新工作空间订阅状态。
 */
export async function handleStripeWebhook(
  rawBody: string,
  sig: string,
): Promise<{ received: boolean; eventType: string }> {
  const stripe = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();

  if (!webhookSecret) {
    throw new Error("STRIPE_WEBHOOK_SECRET not configured");
  }

  // 验证签名
  const event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);

  const supabase = getSupabaseAdmin();

  // 幂等性检查
  const { data: existingEvent } = await supabase
    .from("stripe_events")
    .select("id, processed")
    .eq("stripe_event_id", event.id)
    .maybeSingle();

  if (existingEvent?.processed) {
    return { received: true, eventType: event.type };
  }

  // 记录事件
  await supabase.from("stripe_events").upsert(
    {
      stripe_event_id: event.id,
      event_type: event.type,
      payload: event as unknown as Record<string, unknown>,
      processed: false,
    },
    { onConflict: "stripe_event_id" },
  );

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case "invoice.paid":
        await handleInvoicePaid(event.data.object as Stripe.Invoice);
        break;

      case "invoice.payment_failed":
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case "customer.subscription.updated":
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;

      default:
        log.debug({ eventType: event.type }, "Unhandled webhook event type");
    }

    // 标记已处理
    await supabase
      .from("stripe_events")
      .update({ processed: true })
      .eq("stripe_event_id", event.id);

    return { received: true, eventType: event.type };
  } catch (error) {
    log.error({ eventType: event.type, error }, "Webhook handler error");
    throw error;
  }
}

// ---- 客户门户 ----

/**
 * 创建 Stripe 客户门户会话 URL。
 * 用户可在此管理支付方式、查看发票、取消订阅。
 */
export async function createPortalSession(
  workspaceId: string,
  returnUrl: string,
): Promise<string> {
  if (!isStripeConfigured()) {
    throw new Error("Stripe is not configured");
  }

  const sub = await getSubscription(workspaceId);
  if (!sub?.stripeCustomerId) {
    throw new Error("No Stripe customer found for this workspace");
  }

  const session = await getStripe().billingPortal.sessions.create({
    customer: sub.stripeCustomerId,
    return_url: returnUrl,
  });

  return session.url;
}

// ============================================================
// 内部实现
// ============================================================

// ---- Webhook 事件处理 ----

async function handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
  const rawSession = session as any;
  const workspaceId = rawSession.metadata?.workspace_id;
  const planId = rawSession.metadata?.plan_id;
  const subId =
    typeof rawSession.subscription === "string"
      ? rawSession.subscription
      : rawSession.subscription?.id ?? rawSession.id;

  if (!workspaceId || !planId) {
    log.warn({ sessionId: rawSession.id }, "Checkout completed without workspace_id/plan_id metadata");
    return;
  }

  const customerId =
    typeof rawSession.customer === "string"
      ? rawSession.customer
      : rawSession.customer?.id;

  const supabase = getSupabaseAdmin();

  // 获取完整的 Stripe Subscription 信息（Stripe v22 类型不含 current_period_*，但 API 仍返回）
  let periodStart: string | null = null;
  let periodEnd: string | null = null;
  let status: SubscriptionStatus = "active";

  try {
    const stripeSub = (await getStripe().subscriptions.retrieve(subId)) as any;
    periodStart = stripeSub.current_period_start
      ? new Date(stripeSub.current_period_start * 1000).toISOString()
      : null;
    periodEnd = stripeSub.current_period_end
      ? new Date(stripeSub.current_period_end * 1000).toISOString()
      : null;
    status = stripeSub.status as SubscriptionStatus;
  } catch (err) {
    log.warn({ subscriptionId: subId, error: err }, "Could not retrieve Stripe subscription details, using defaults");
  }

  await supabase.from("workspace_subscriptions").upsert(
    {
      workspace_id: workspaceId,
      plan_id: planId,
      status,
      stripe_subscription_id: subId,
      stripe_customer_id: customerId ?? null,
      current_period_start: periodStart,
      current_period_end: periodEnd,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "workspace_id" },
  );

  log.info(
    { workspaceId, planId, subscriptionId: subId, status },
    "[billing] Checkout completed — subscription activated",
  );
}

async function handleInvoicePaid(invoice: Stripe.Invoice): Promise<void> {
  const raw = invoice as any;
  const subscriptionId = raw.subscription as string;
  if (!subscriptionId) return;

  const supabase = getSupabaseAdmin();

  const updateData: Record<string, unknown> = {
    status: "active",
    updated_at: new Date().toISOString(),
  };

  if (raw.period_start) {
    updateData.current_period_start = new Date(raw.period_start * 1000).toISOString();
  }
  if (raw.period_end) {
    updateData.current_period_end = new Date(raw.period_end * 1000).toISOString();
  }

  await supabase
    .from("workspace_subscriptions")
    .update(updateData)
    .eq("stripe_subscription_id", subscriptionId);

  log.info(
    { subscriptionId, periodEnd: updateData.current_period_end },
    "[billing] Invoice paid — subscription period extended",
  );
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
  const raw = invoice as any;
  const subscriptionId = raw.subscription as string;
  if (!subscriptionId) return;

  const supabase = getSupabaseAdmin();

  await supabase
    .from("workspace_subscriptions")
    .update({
      status: "past_due",
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_subscription_id", subscriptionId);

  log.warn(
    { subscriptionId, invoiceId: raw.id },
    "[billing] Invoice payment failed — subscription marked past_due",
  );
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
  const raw = subscription as any;
  const subId = raw.id;
  const supabase = getSupabaseAdmin();

  await supabase
    .from("workspace_subscriptions")
    .update({
      status: "canceled",
      plan_id: "free",
      cancel_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_subscription_id", subId);

  log.info(
    { subscriptionId: subId },
    "[billing] Subscription deleted — reverted to free plan",
  );
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
  const raw = subscription as any;
  const subId = raw.id;
  const supabase = getSupabaseAdmin();

  const metadata = raw.metadata;
  const planId = metadata?.plan_id ?? inferPlanFromSubscription(subscription as any);

  await supabase
    .from("workspace_subscriptions")
    .update({
      status: raw.status as SubscriptionStatus,
      current_period_start: raw.current_period_start
        ? new Date(raw.current_period_start * 1000).toISOString()
        : null,
      current_period_end: raw.current_period_end
        ? new Date(raw.current_period_end * 1000).toISOString()
        : null,
      cancel_at: raw.cancel_at
        ? new Date(raw.cancel_at * 1000).toISOString()
        : null,
      plan_id: planId,
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_subscription_id", subId);

  log.info(
    { subscriptionId: subId, status: raw.status, planId },
    "[billing] Subscription updated",
  );
}

/**
 * 从 Stripe Subscription 的物品中推断方案 ID。
 * 当 metadata.plan_id 不存在时的回退。
 */
function inferPlanFromSubscription(subscription: any): string {
  try {
    const priceId = subscription.items?.data?.[0]?.price?.id;
    if (!priceId) return "free";

    // 反向查找价格 ID 映射
    const intervals: BillingInterval[] = ["monthly", "yearly"];
    for (const plan of HARDCODED_PLANS) {
      for (const interval of intervals) {
        if (getStripePriceId(plan.id, interval) === priceId) {
          return plan.id;
        }
      }
    }
    return "pro";
  } catch {
    return "free";
  }
}

// ---- 辅助函数 ----

/**
 * 将数据库行映射为 WorkspaceSubscription 类型。
 */
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

/**
 * 获取方案的限额值。
 */
function getLimitValue(
  limits: PricingPlan["limits"],
  metric: UsageMetric,
): number {
  switch (metric) {
    case "codegen":
      return limits.codegenPerMonth;
    case "storage":
      return limits.storageMB;
    case "members":
      return limits.members;
  }
}

/**
 * 获取工作空间某项指标的当前用量。
 */
async function getCurrentUsage(
  workspaceId: string,
  metric: UsageMetric,
): Promise<number> {
  if (metric === "members") {
    const supabase = getSupabaseAdmin();
    const { count } = await supabase
      .from("workspace_members")
      .select("*", { count: "exact", head: true })
      .eq("workspace_id", workspaceId);
    return count ?? 1;
  }

  // codegen 和 storage 来自 usage_records
  const report = await getUsageReport(workspaceId);
  switch (metric) {
    case "codegen":
      return report.codegenCount;
    case "storage":
      return report.storageBytes;
    default:
      return 0;
  }
}

/**
 * 为 workspace 创建或获取 Stripe Customer。
 * 一个 workspace 对应一个 Stripe Customer。
 */
async function getOrCreateStripeCustomer(
  workspaceId: string,
  workspaceName: string,
): Promise<string> {
  const supabase = getSupabaseAdmin();

  // 查找已有 Stripe customer
  const { data: existingSub } = await supabase
    .from("workspace_subscriptions")
    .select("stripe_customer_id")
    .eq("workspace_id", workspaceId)
    .not("stripe_customer_id", "is", null)
    .maybeSingle();

  if (existingSub?.stripe_customer_id) {
    return existingSub.stripe_customer_id;
  }

  // 获取 workspace owner 的信息用于创建 customer
  const { data: workspace } = await supabase
    .from("workspaces")
    .select("owner_id")
    .eq("id", workspaceId)
    .single();

  let customerEmail: string | undefined;
  if (workspace?.owner_id) {
    const { data: user } = await supabase.auth.admin.getUserById(workspace.owner_id);
    customerEmail = user?.user?.email ?? undefined;
  }

  // 创建 Stripe Customer
  const customer = await getStripe().customers.create({
    name: workspaceName,
    email: customerEmail,
    metadata: { workspace_id: workspaceId },
  });

  return customer.id;
}

/**
 * 创建免费的本地订阅（非 Stripe 模式）。
 */
async function upsertFreeSubscription(workspaceId: string): Promise<string> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("workspace_subscriptions")
    .upsert(
      {
        workspace_id: workspaceId,
        plan_id: "free",
        status: "active",
      },
      { onConflict: "workspace_id" },
    )
    .select("id")
    .single();

  if (error) {
    log.error({ workspaceId, error }, "Failed to upsert free subscription");
    throw error;
  }

  return data.id;
}

/**
 * 在本地模式（无 Stripe）下创建订阅记录。
 */
async function createLocalSubscription(
  workspaceId: string,
  planId: string,
  interval: BillingInterval,
): Promise<string> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("workspace_subscriptions")
    .upsert(
      {
        workspace_id: workspaceId,
        plan_id: planId,
        status: "active",
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(
          interval === "monthly"
            ? Date.now() + 30 * 24 * 60 * 60 * 1000
            : Date.now() + 365 * 24 * 60 * 60 * 1000,
        ).toISOString(),
      },
      { onConflict: "workspace_id" },
    )
    .select("id")
    .single();

  if (error) {
    log.error({ workspaceId, error }, "Failed to create local subscription");
    throw error;
  }

  return data.id;
}
