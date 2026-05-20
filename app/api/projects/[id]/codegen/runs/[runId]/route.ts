import { NextRequest, NextResponse } from "next/server";

import { artifactExists } from "@/lib/codegen/artifacts";
import { getCodegenRun } from "@/lib/codegen/runs";
import { getSupabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string; runId: string } }
) {
  try {
    const { id: projectId, runId } = params;

    const { data: project, error } = await getSupabaseAdmin()
      .from("projects")
      .select("id")
      .eq("id", projectId)
      .single();

    if (error || !project) {
      return NextResponse.json({ error: "项目不存在" }, { status: 404 });
    }

    const run = await getCodegenRun(runId);
    if (!run || run.project_id !== projectId) {
      return NextResponse.json({ error: "codegen 记录不存在" }, { status: 404 });
    }

    const hasArtifact =
      run.status === "completed" &&
      !!run.artifact_path &&
      (await artifactExists(run.artifact_path));

    return NextResponse.json({
      run,
      downloadUrl: hasArtifact
        ? `/api/projects/${projectId}/codegen/runs/${runId}/download`
        : null
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "查询 codegen 记录失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
