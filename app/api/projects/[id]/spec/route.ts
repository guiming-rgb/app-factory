import { NextRequest, NextResponse } from "next/server";

import { buildSpecForProject } from "@/lib/app-spec/from-report";
import { fetchProjectWithAccess } from "@/lib/auth/require-project-access";

export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const projectId = params.id;
    const sourceParam = req.nextUrl.searchParams.get("source");
    const preferReport = sourceParam !== "title";

    const access = await fetchProjectWithAccess<{
      id: string;
      title: string;
      idea: string;
      final_report: string | null;
      status: string;
    }>(projectId, "id, title, idea, final_report, status");
    if (!access.ok) {
      return access.response;
    }
    const project = access.project;

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
