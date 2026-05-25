import { NextRequest, NextResponse } from "next/server";
import { fetchProjectWithAccess } from "@/lib/auth/require-project-access";
import { getSupabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const projectId = params.id;

    const access = await fetchProjectWithAccess(projectId, "*");
    if (!access.ok) {
      return access.response;
    }
    const project = access.project;

    const { data: runs, error: runsError } = await getSupabaseAdmin()
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
