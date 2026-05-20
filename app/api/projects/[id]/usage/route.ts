import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { getProjectUsageSummary } from "@/lib/usage-logs";
import { APP_FEATURES } from "@/lib/app-features";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 浏览器打开可自检：库内 usage_logs 行数 + 汇总（验收 v1.3 用） */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const projectId = params.id;

  const { data: project, error: projectError } = await getSupabaseAdmin()
    .from("projects")
    .select("id, title, status")
    .eq("id", projectId)
    .single();

  if (projectError || !project) {
    return NextResponse.json(
      { error: "项目不存在", projectId, hint: "检查 URL 里的 ID 是否完整、无拼错" },
      { status: 404 }
    );
  }

  const { count, error: countError } = await getSupabaseAdmin()
    .from("usage_logs")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId)
    .eq("event_type", "llm_call");

  const summary = await getProjectUsageSummary(projectId);

  return NextResponse.json({
    build: APP_FEATURES,
    project,
    usage_logs_row_count: countError ? null : count ?? 0,
    usage_logs_query_error: countError?.message ?? null,
    summary
  });
}
