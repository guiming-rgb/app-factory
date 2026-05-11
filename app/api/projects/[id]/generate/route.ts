import { NextRequest, NextResponse } from "next/server";
import {
  runProjectWorkflow,
  WORKFLOW_ERROR_ALREADY_RUNNING
} from "@/lib/workflow";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * MVP 阶段同步执行 8 个 Agent。
 * 本地开发可接受；Vercel 需注意函数超时（已尽量放宽 maxDuration，仍以套餐为准）。
 * 正式版应改为队列 Worker。
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const projectId = params.id;

    let forceRegenerate = false;
    try {
      const text = await req.text();
      if (text.trim()) {
        const body = JSON.parse(text) as { forceRegenerate?: unknown };
        forceRegenerate = Boolean(body?.forceRegenerate);
      }
    } catch {
      forceRegenerate = false;
    }

    const result = await runProjectWorkflow(projectId, { forceRegenerate });

    if (!result.success) {
      const status =
        result.error === WORKFLOW_ERROR_ALREADY_RUNNING ? 409 : 400;
      return NextResponse.json(result, { status });
    }

    return NextResponse.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "生成失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
