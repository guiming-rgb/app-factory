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
      console.error("[GET /api/projects/[id]] runs", runsError.message);
      return NextResponse.json({ error: "查询项目记录失败，请稍后重试" }, { status: 500 });
    }

    return NextResponse.json({
      project,
      runs: runs || []
    });
  } catch (error: unknown) {
    console.error("[GET /api/projects/[id]]", error);
    return NextResponse.json({ error: "查询项目失败，请稍后重试" }, { status: 500 });
  }
}
