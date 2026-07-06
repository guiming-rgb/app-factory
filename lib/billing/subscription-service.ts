// ============================================================
// 订阅与计费服务 — 向后兼容重导出
//
// P2-13: 已拆分为 4 个模块。
// 本文件保留所有原有导出以保证现有导入不受影响。
// 新代码请直接从对应子模块导入：
//   - pricing     → ./pricing
//   - subscriptions → ./subscriptions
//   - usage       → ./usage
//   - invoicing   → ./invoicing
// ============================================================

export {
  type PlanTier, type BillingInterval, type PricingPlan,
  HARDCODED_PLANS, getPricingPlans, getPlanById,
  getStripePriceId, getLimitValue,
} from "./pricing";

export {
  type SubscriptionStatus, type WorkspaceSubscription,
  createSubscription, getSubscription, cancelSubscription,
  resumeSubscription, changePlan, isFeatureEnabled,
} from "./subscriptions";

export {
  type UsageMetrics, type UsageCheckResult, type UsageMetric,
  checkUsageLimit, recordUsage, getUsageReport,
} from "./usage";

export {
  handleStripeWebhook, createPortalSession,
} from "./invoicing";
