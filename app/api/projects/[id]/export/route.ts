import { NextRequest, NextResponse } from "next/server";
import { fetchProjectWithAccess } from "@/lib/auth/require-project-access";

export const runtime = "nodejs";

function safeFileName(name: string) {
  return name
    .replace(/[\\/:*?"<>|]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 50);
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const projectId = params.id;

    const access = await fetchProjectWithAccess<{
      title: string;
      final_report: string | null;
      status: string;
    }>(projectId, "title, final_report, status");
    if (!access.ok) {
      return access.response;
    }
    const project = access.project;

    if (!project.final_report) {
      return NextResponse.json(
        { error: "当前项目还没有可导出的报告" },
        { status: 400 }
      );
    }

    const baseName = safeFileName(project.title || "app-report");
    const fileName = `${baseName}.md`;
    const encoded = encodeURIComponent(fileName);

    return new NextResponse(project.final_report, {
      status: 200,
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="app-report.md"; filename*=UTF-8''${encoded}`
      }
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "导出失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
