import { NextRequest, NextResponse } from "next/server";

import { getApiUser } from "@/lib/auth/api-user";
import { runFlutterCodegenSync } from "@/lib/codegen/run-flutter-sync";
import { enforceRateLimit } from "@/lib/auth/rate-limit";
import { guardProjectAccess } from "@/lib/auth/require-project-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

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
    const user = await getApiUser();
    const limited = await enforceRateLimit(req, "codegen", user?.id);
    if (limited) {
      return limited;
    }

    const run = await runFlutterCodegenSync({ projectId });

    return NextResponse.json({
      success: true,
      mode: "sync",
      target: "flutter",
      runId: run.id,
      status: run.status,
      message: "Flutter codegen 已完成（同步生成，无需 Inngest 队列）"
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "启动 Flutter codegen 失败";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
