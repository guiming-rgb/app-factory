// ============================================================
// 定价方案模块
//
// 从 lib/billing/subscription-service.ts 拆分（P2-13）。
// 纯函数 + 常量，零外部依赖。
// ============================================================

export type PlanTier = "free" | "pro" | "enterprise";

export type BillingInterval = "monthly" | "yearly";

export interface PricingPlan {
  id: string;
  name: string;
  tier: PlanTier;
  priceMonthly: number;
  priceYearly: number;
  features: string[];
  limits: {
    projects: number;
    codegenPerMonth: number;
    storageMB: number;
    members: number;
  };
}

export const HARDCODED_PLANS: PricingPlan[] = [
  {
    id: "free", name: "Free", tier: "free",
    priceMonthly: 0, priceYearly: 0,
    features: ["最多 3 个项目", "每月 10 次代码生成", "100MB 存储空间", "1 位成员"],
    limits: { projects: 3, codegenPerMonth: 10, storageMB: 100, members: 1 },
  },
  {
    id: "pro", name: "Pro", tier: "pro",
    priceMonthly: 9900, priceYearly: 99000,
    features: ["最多 20 个项目", "每月 100 次代码生成", "1GB 存储空间", "最多 5 位成员", "优先队列", "自定义域名", "去除水印"],
    limits: { projects: 20, codegenPerMonth: 100, storageMB: 1024, members: 5 },
  },
  {
    id: "enterprise", name: "Enterprise", tier: "enterprise",
    priceMonthly: 49900, priceYearly: 499000,
    features: ["不限项目数", "每月 500 次代码生成", "10GB 存储空间", "不限成员数", "SSO 单点登录", "白标定制", "SLA 保障", "专属技术支持"],
    limits: { projects: -1, codegenPerMonth: 500, storageMB: 10240, members: -1 },
  },
];

export function getPricingPlans(): PricingPlan[] {
  return HARDCODED_PLANS;
}

export function getPlanById(planId: string): PricingPlan | undefined {
  return HARDCODED_PLANS.find((p) => p.id === planId);
}

export function getStripePriceId(planId: string, interval: BillingInterval): string | null {
  const key = `STRIPE_PRICE_${planId.toUpperCase()}_${interval.toUpperCase()}`;
  return process.env[key]?.trim() ?? null;
}

export function getLimitValue(limits: PricingPlan["limits"], metric: string): number {
  switch (metric) {
    case "codegen": return limits.codegenPerMonth;
    case "storage": return limits.storageMB;
    case "members": return limits.members;
    default: return 0;
  }
}
