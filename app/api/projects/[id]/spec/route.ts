import { NextRequest, NextResponse } from "next/server";

import { buildSpecForProject } from "@/lib/app-spec/from-report";
import { getSupabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const projectId = params.id;
    const sourceParam = req.nextUrl.searchParams.get("source");
    const preferReport = sourceParam !== "title";

    const { data: project, error } = await getSupabaseAdmin()
      .from("projects")
      .select("id, title, idea, final_report, status")
      .eq("id", projectId)
      .single();

    if (error || !project) {
      return NextResponse.json({ error: "项目不存在" }, { status: 404 });
    }

    if (sourceParam === "title") {
      const { buildMinimalSpecFromProject } = await import(
        "@/lib/app-spec/from-project"
      );
      return NextResponse.json({
        spec: buildMinimalSpecFromProject({
          id: project.id,
          title: project.title ?? "未命名",
          idea: project.idea
        }),
        source: "title-heuristic"
      });
    }

    const result = await buildSpecForProject(
      {
        id: project.id,
        title: project.title ?? "未命名",
        idea: project.idea,
        final_report: project.final_report
      },
      { preferReport }
    );

    return NextResponse.json({
      spec: result.spec,
      source: result.source,
      warning: result.warning ?? null,
      hasReport: Boolean(project.final_report?.trim())
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Spec 生成失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
