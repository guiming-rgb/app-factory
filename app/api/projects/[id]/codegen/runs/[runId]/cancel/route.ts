import { NextResponse } from "next/server";

import { getApiUser, unauthorizedResponse } from "@/lib/auth/api-user";
import { guardProjectAccess } from "@/lib/auth/require-project-access";
import { getCodegenRun, markCodegenRunFailed } from "@/lib/codegen/runs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  _req: Request,
  { params }: { params: { id: string; runId: string } }
) {
  try {
    const user = await getApiUser();
    if (!user) {
      return unauthorizedResponse();
    }

    const denied = await guardProjectAccess(params.id);
    if (denied) {
      return denied;
    }

    const run = await getCodegenRun(params.runId);
    if (!run || run.project_id !== params.id) {
      return NextResponse.json({ error: "codegen 记录不存在" }, { status: 404 });
    }

    if (run.status !== "queued" && run.status !== "running") {
      return NextResponse.json(
        { error: "仅 queued/running 可取消" },
        { status: 400 }
      );
    }

    await markCodegenRunFailed(
      run.id,
      "用户手动取消（或卡住后标记失败，可重新生成）"
    );

    return NextResponse.json({ ok: true, runId: run.id, status: "failed" });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "取消失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
