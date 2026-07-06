import { NextRequest, NextResponse } from "next/server";
import { getApiUser, unauthorizedResponse } from "@/lib/auth/api-user";
import { requireAdmin } from "@/lib/auth/require-admin";
import { isAuthEnabled } from "@/lib/auth-config";

import {
  getExperiment,
  getExperimentResults,
  updateExperiment,
} from "@/lib/experiments/ab-testing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET /api/experiments/[id]
 *
 * 获取实验详情 + 当前结果。
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getApiUser();
    if (isAuthEnabled() && !user) {
      return unauthorizedResponse();
    }

    const experiment = await getExperiment(params.id);
    if (!experiment) {
      return NextResponse.json({ error: "实验不存在" }, { status: 404 });
    }

    // 获取实验结果（running / completed 状态时提供）
    let results = null;
    if (experiment.status === "running" || experiment.status === "completed") {
      results = await getExperimentResults(params.id);
    }

    return NextResponse.json({
      experiment,
      results,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "查询实验失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * PUT /api/experiments/[id]
 *
 * 更新实验配置。
 * Body: { name?, description?, variants?, trafficAllocation?, status?, startAt?, endAt? }
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const body: Record<string, unknown> = await request.json();

    if (Object.keys(body).length === 0) {
      return NextResponse.json({ error: "没有要更新的字段" }, { status: 400 });
    }

    const experiment = await updateExperiment(params.id, body);

    return NextResponse.json({ experiment });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "更新实验失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
