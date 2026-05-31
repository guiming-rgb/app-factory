import { NextRequest, NextResponse } from "next/server";

import { enrichCodegenRun } from "@/lib/codegen/run-response";
import { getCodegenRun } from "@/lib/codegen/runs";
import { guardProjectAccess } from "@/lib/auth/require-project-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string; runId: string } }
) {
  try {
    const { id: projectId, runId } = params;

    const denied = await guardProjectAccess(projectId);
    if (denied) {
      return denied;
    }

    const run = await getCodegenRun(runId);
    if (!run || run.project_id !== projectId) {
      return NextResponse.json({ error: "codegen 记录不存在" }, { status: 404 });
    }

    const enriched = await enrichCodegenRun(run, projectId);

    return NextResponse.json({
      run: enriched,
      downloadUrl: enriched.downloadUrl,
      downloadMacUrl: enriched.downloadMacUrl,
      downloadWinUrl: enriched.downloadWinUrl,
      previewUrl: enriched.previewUrl
    }, {
      headers: { "Cache-Control": "no-store" }
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "查询 codegen 记录失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
