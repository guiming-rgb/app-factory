import { NextRequest, NextResponse } from "next/server";

import { enqueueCodegenJob } from "@/lib/codegen/enqueue";
import { guardProjectAccess } from "@/lib/auth/require-project-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const projectId = params.id;

  const denied = await guardProjectAccess(projectId);
  if (denied) {
    return denied;
  }

  try {
    const run = await enqueueCodegenJob({ projectId, target: "flutter" });

    return NextResponse.json({
      success: true,
      mode: "async",
      target: "flutter",
      runId: run.id,
      status: run.status,
      message: "Flutter codegen 已进入后台队列"
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "启动 Flutter codegen 失败";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
