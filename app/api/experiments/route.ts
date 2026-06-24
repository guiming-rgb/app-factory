import { NextRequest, NextResponse } from "next/server";
import { getApiUser, unauthorizedResponse } from "@/lib/auth/api-user";
import { isAuthEnabled } from "@/lib/auth-config";

import {
  createExperiment,
  listExperiments,
  type ExperimentConfig,
  type ExperimentStatus,
} from "@/lib/experiments/ab-testing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET /api/experiments?status=
 *
 * 获取实验列表。支持按状态过滤。
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getApiUser();
    if (isAuthEnabled() && !user) {
      return unauthorizedResponse();
    }

    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get("status");

    let status: ExperimentStatus | undefined;
    if (statusParam) {
      const validStatuses: ExperimentStatus[] = ["draft", "running", "paused", "completed"];
      if (!validStatuses.includes(statusParam as ExperimentStatus)) {
        return NextResponse.json(
          { error: `无效的状态值：${statusParam}，可选值：${validStatuses.join(", ")}` },
          { status: 400 }
        );
      }
      status = statusParam as ExperimentStatus;
    }

    const experiments = await listExperiments(status);

    return NextResponse.json({ experiments });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "获取实验列表失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/experiments
 *
 * 创建新实验（admin 操作）。
 * Body: { name, description?, variants, trafficAllocation?, startAt?, endAt? }
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getApiUser();
    if (isAuthEnabled() && !user) {
      return unauthorizedResponse();
    }

    const body: Record<string, unknown> = await request.json();

    // 校验必填字段
    if (!body.name || typeof body.name !== "string" || !body.name.trim()) {
      return NextResponse.json({ error: "实验名称（name）不能为空" }, { status: 400 });
    }

    if (!Array.isArray(body.variants) || body.variants.length < 2) {
      return NextResponse.json(
        { error: "至少需要 2 个变体（variants 字段）" },
        { status: 400 }
      );
    }

    const validStrings = body.variants.every(
      (v: unknown) => typeof v === "string" && v.trim().length > 0
    );
    if (!validStrings) {
      return NextResponse.json(
        { error: "variants 中的每个元素必须是非空字符串" },
        { status: 400 }
      );
    }

    if (new Set(body.variants as string[]).size !== (body.variants as string[]).length) {
      return NextResponse.json({ error: "变体名称不能重复" }, { status: 400 });
    }

    const config: ExperimentConfig = {
      name: (body.name as string).trim(),
      description: typeof body.description === "string" ? body.description.trim() : undefined,
      variants: (body.variants as string[]).map((v: string) => v.trim()),
      trafficAllocation:
        typeof body.trafficAllocation === "number" ? body.trafficAllocation : undefined,
      startAt: typeof body.startAt === "string" ? body.startAt : undefined,
      endAt: typeof body.endAt === "string" ? body.endAt : undefined,
    };

    const experiment = await createExperiment(config);

    return NextResponse.json({ experiment }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "创建实验失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
