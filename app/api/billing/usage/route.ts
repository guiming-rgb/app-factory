// ============================================================
// GET|POST /api/billing/usage — 用量管理端点
//
// GET  — 获取工作空间的当前用量统计
//   Query: ?workspaceId=<uuid>
//   Response:
//     {
//       workspaceId, month, codegenCount, storageBytes, memberCount,
//       limits: { codegenPerMonth, storageMB, members },
//       planId, tier
//     }
//
// POST — 记录用量事件（内部端点，由 codegen pipeline 等调用）
//   Body: { workspaceId, metric: "codegen"|"storage"|"members", amount?: number }
//   Response: { received: true }
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import {
  getUsageReport,
  recordUsage,
  getSubscription,
  getPlanById,
  type UsageMetric,
} from "@/lib/billing/subscription-service";
import { createComponentLogger } from "@/lib/logger";

export const runtime = "nodejs";

const log = createComponentLogger("billing-usage");

// ============================================================
// GET — 用量查询
// ============================================================

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get("workspaceId");
    const month = searchParams.get("month") ?? undefined;

    if (!workspaceId) {
      return NextResponse.json(
        { error: "workspaceId query parameter is required" },
        { status: 400 },
      );
    }

    const [report, subscription] = await Promise.all([
      getUsageReport(workspaceId, month),
      getSubscription(workspaceId),
    ]);

    const plan = getPlanById(subscription?.planId ?? "free");

    return NextResponse.json({
      ...report,
      planId: subscription?.planId ?? "free",
      tier: plan?.tier ?? "free",
      limits: plan?.limits ?? {
        projects: 3,
        codegenPerMonth: 10,
        storageMB: 100,
        members: 1,
      },
    });
  } catch (error) {
    log.error({ error }, "[billing/usage] GET failed");
    return NextResponse.json(
      { error: "Failed to fetch usage data" },
      { status: 500 },
    );
  }
}

// ============================================================
// POST — 记录用量
// ============================================================

interface UsageRecordBody {
  workspaceId: string;
  metric: UsageMetric;
  amount?: number;
}

export async function POST(req: NextRequest) {
  try {
    const body: UsageRecordBody = await req.json();

    // ── 参数校验 ──
    if (!body.workspaceId || typeof body.workspaceId !== "string") {
      return NextResponse.json(
        { error: "workspaceId is required" },
        { status: 400 },
      );
    }

    const validMetrics: UsageMetric[] = ["codegen", "storage", "members"];
    if (!body.metric || !validMetrics.includes(body.metric)) {
      return NextResponse.json(
        {
          error: `Invalid metric. Must be one of: ${validMetrics.join(", ")}`,
        },
        { status: 400 },
      );
    }

    const amount = typeof body.amount === "number" ? body.amount : 1;
    if (amount < 0) {
      return NextResponse.json(
        { error: "amount must be a non-negative integer" },
        { status: 400 },
      );
    }

    // ── 记录用量 ──
    await recordUsage(body.workspaceId, body.metric, amount);

    log.debug(
      { workspaceId: body.workspaceId, metric: body.metric, amount },
      "[billing/usage] Usage recorded",
    );

    return NextResponse.json({ received: true });
  } catch (error) {
    log.error({ error }, "[billing/usage] POST failed");
    return NextResponse.json(
      { error: "Failed to record usage" },
      { status: 500 },
    );
  }
}
