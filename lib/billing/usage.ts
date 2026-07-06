// ============================================================
// 用量追踪模块
//
// 从 lib/billing/subscription-service.ts 拆分（P2-13）。
// 依赖：subscriptions.ts, pricing.ts
// ============================================================

import { getSupabaseAdmin } from "@/lib/supabase";
import { getSubscription } from "./subscriptions";
import { HARDCODED_PLANS, getPlanById, getLimitValue } from "./pricing";

export interface UsageMetrics {
  workspaceId: string;
  month: string;
  codegenCount: number;
  storageBytes: number;
  memberCount: number;
}

export interface UsageCheckResult {
  allowed: boolean;
  current: number;
  limit: number;
  reason?: string;
}

export type UsageMetric = "codegen" | "storage" | "members";

function currentMonthKey(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export async function checkUsageLimit(workspaceId: string, metric: UsageMetric): Promise<UsageCheckResult> {
  const sub = await getSubscription(workspaceId);
  const plan = getPlanById(sub?.planId ?? "free") ?? HARDCODED_PLANS[0];
  const limit = getLimitValue(plan.limits, metric);
  const current = await getCurrentUsage(workspaceId, metric);
  if (limit === -1) return { allowed: true, current, limit };
  const allowed = current < limit;
  return { allowed, current, limit, reason: allowed ? undefined : `${metric} usage (${current}) exceeds plan limit (${limit})` };
}

export async function recordUsage(workspaceId: string, metric: UsageMetric, amount: number = 1): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("usage_records")
    .insert({ workspace_id: workspaceId, metric, amount });
  if (error) {
    console.error("[billing:usage] recordUsage failed:", error.message);
    throw new Error(`记录用量失败：${error.message}`);
  }
}

export async function getUsageReport(workspaceId: string, month?: string): Promise<UsageMetrics> {
  const monthKey = month ?? currentMonthKey();
  const [year, m] = monthKey.split("-").map(Number);
  const startDate = new Date(Date.UTC(year, m - 1, 1));
  const endDate = new Date(Date.UTC(year, m, 1));
  const supabase = getSupabaseAdmin();
  const { data: records, error } = await supabase
    .from("usage_records")
    .select("metric, amount")
    .eq("workspace_id", workspaceId)
    .gte("recorded_at", startDate.toISOString())
    .lt("recorded_at", endDate.toISOString());

  if (error) {
    console.error("[billing:usage] getUsageReport failed:", error.message);
    throw new Error(`获取用量报告失败：${error.message}`);
  }

  const codegenCount = (records ?? []).filter((r) => r.metric === "codegen").reduce((sum, r) => sum + (r.amount ?? 0), 0);
  const storageBytes = (records ?? []).filter((r) => r.metric === "storage").reduce((sum, r) => sum + (r.amount ?? 0), 0);
  const memberRecords = (records ?? []).filter((r) => r.metric === "members");
  const memberCount = memberRecords.length > 0 ? memberRecords[memberRecords.length - 1].amount ?? 0 : 1;
  return { workspaceId, month: monthKey, codegenCount, storageBytes, memberCount };
}

async function getCurrentUsage(workspaceId: string, metric: UsageMetric): Promise<number> {
  if (metric === "members") {
    const supabase = getSupabaseAdmin();
    const { count, error } = await supabase
      .from("workspace_members")
      .select("*", { count: "exact", head: true })
      .eq("workspace_id", workspaceId);
    if (error) {
      console.warn("[billing:usage] getCurrentUsage(members) failed:", error.message);
      return 1;
    }
    return count ?? 1;
  }
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
