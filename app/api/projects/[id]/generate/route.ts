import { NextRequest, NextResponse } from "next/server";
import { inngest } from "@/lib/inngest/client";
import { getApiUser } from "@/lib/auth/api-user";
import { inngestUserIdFromSession } from "@/lib/auth/inngest-project-auth";
import { enforceRateLimit } from "@/lib/auth/rate-limit";
import { guardProjectAccess } from "@/lib/auth/require-project-access";
import {
  markProjectFailed,
  prepareProjectWorkflow,
  WORKFLOW_ERROR_ALREADY_RUNNING
} from "@/lib/workflow";

export const runtime = "nodejs";

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "启动 AI 生产失败";
}

async function parseJsonBody(req: NextRequest) {
  try {
    const text = await req.text();
    if (!text.trim()) {
      return {};
    }
    return JSON.parse(text) as { forceRegenerate?: unknown };
  } catch {
    return {};
  }
}

/**
 * v1.2：仅做 prepare + 投递 Inngest 事件，立即返回；实际 8 Agent 在后台执行。
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const projectId = params.id;

  const denied = await guardProjectAccess(projectId);
  if (denied) {
    return denied;
  }

  try {
    const body = await parseJsonBody(req);
    const forceRegenerate = Boolean(body.forceRegenerate);
    const user = await getApiUser();

    const limited = await enforceRateLimit(req, "generate", user?.id);
    if (limited) {
      return limited;
    }

    await prepareProjectWorkflow(projectId, { forceRegenerate });

    try {
      await inngest.send({
        name: "project/generate.requested",
        data: {
          projectId,
          forceRegenerate,
          ...inngestUserIdFromSession(user?.id)
        }
      });
    } catch (eventError: unknown) {
      const message = getErrorMessage(eventError);
      await markProjectFailed(
        projectId,
        `后台任务投递失败：${message}`
      );
      throw new Error(`后台任务投递失败：${message}`);
    }

    return NextResponse.json({
      success: true,
      mode: "async",
      projectId,
      message: "AI 生产任务已进入后台队列"
    });
  } catch (error: unknown) {
    const message = getErrorMessage(error);

    let status = 400;
    if (message === WORKFLOW_ERROR_ALREADY_RUNNING) {
      status = 409;
    }

    return NextResponse.json(
      {
        success: false,
        error: message
      },
      { status }
    );
  }
}
