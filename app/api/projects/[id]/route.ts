import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const projectId = params.id;

    const { data: project, error: projectError } = await supabaseAdmin
      .from("projects")
      .select("*")
      .eq("id", projectId)
      .single();

    if (projectError || !project) {
      return NextResponse.json({ error: "项目不存在" }, { status: 404 });
    }

    const { data: runs, error: runsError } = await supabaseAdmin
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
