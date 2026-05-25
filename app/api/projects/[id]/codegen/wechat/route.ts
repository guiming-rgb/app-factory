import { NextRequest, NextResponse } from "next/server";

import { getApiUser } from "@/lib/auth/api-user";
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
    const user = await getApiUser();
    const run = await enqueueCodegenJob({
      projectId,
      target: "wechat",
      userId: user?.id
    });

    return NextResponse.json({
      success: true,
      mode: "async",
      target: "wechat",
      runId: run.id,
      status: run.status,
      message: "微信小程序 codegen 已进入后台队列"
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "启动微信小程序 codegen 失败";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
