import { NextRequest, NextResponse } from "next/server";
import {
  fetchProjectWithAccess,
  getSupabaseForUserRead
} from "@/lib/auth/require-project-access";
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

  const access = await fetchProjectWithAccess<{
    id: string;
    title: string;
    status: string;
  }>(projectId, "id, title, status");
  if (!access.ok) {
    return access.response;
  }
  const project = access.project;

  const supabase = await getSupabaseForUserRead();
  if (!supabase) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const { count, error: countError } = await supabase
    .from("usage_logs")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId)
    .eq("event_type", "llm_call");

  const summary = await getProjectUsageSummary(projectId, supabase);

  return NextResponse.json({
    build: APP_FEATURES,
    project,
    usage_logs_row_count: countError ? null : count ?? 0,
    usage_logs_query_error: countError?.message ?? null,
    summary
  });
}
