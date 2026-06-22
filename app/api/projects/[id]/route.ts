import { NextRequest, NextResponse } from "next/server";
import { requireProjectOwner } from "@/lib/auth/require-auth";
import {
  fetchProjectWithAccess,
  getSupabaseForUserRead
} from "@/lib/auth/require-project-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const projectId = params.id;

    const auth = await requireProjectOwner(projectId);
    if (auth.error) return auth.error;

    const access = await fetchProjectWithAccess(projectId, "*");
    if (!access.ok) {
      return access.response;
    }
    const project = access.project;

    const supabase = await getSupabaseForUserRead();
    if (!supabase) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const { data: runs, error: runsError } = await supabase
      .from("agent_runs")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: true });

    if (runsError) {
      return NextResponse.json({ error: runsError.message }, { status: 500 });
    }

    return NextResponse.json({
      project,
      runs: runs || []
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "查询项目失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
