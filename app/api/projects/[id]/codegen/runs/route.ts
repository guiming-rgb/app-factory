import { NextRequest, NextResponse } from "next/server";

import { enrichCodegenRuns } from "@/lib/codegen/run-response";
import { listCodegenRuns } from "@/lib/codegen/runs";
import { getSupabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const projectId = params.id;
    const { data: project, error } = await getSupabaseAdmin()
      .from("projects")
      .select("id")
      .eq("id", projectId)
      .single();

    if (error || !project) {
      return NextResponse.json({ error: "项目不存在" }, { status: 404 });
    }

    const runs = await listCodegenRuns(projectId);
    const enriched = await enrichCodegenRuns(runs, projectId);
    return NextResponse.json({ runs: enriched }, {
      headers: { "Cache-Control": "no-store" }
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "查询 codegen 记录失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
