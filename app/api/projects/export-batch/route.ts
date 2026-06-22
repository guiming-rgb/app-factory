import { requireProjectOwner } from "@/lib/auth/require-auth";
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { enrichCodegenRuns } from "@/lib/codegen/run-response";
import { listCodegenRuns } from "@/lib/codegen/runs";
import { fetchProjectWithAccess } from "@/lib/auth/require-project-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST: 批量项目导出
 * body: { projectIds: string[] }
 * 返回每个项目的产物下载链接集合
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const ids = (Array.isArray(body.projectIds) ? body.projectIds : []) as string[];

    if (!ids.length) {
      return NextResponse.json({ error: "请提供 projectIds 数组" }, { status: 400 });
    }
    if (ids.length > 20) {
      return NextResponse.json({ error: "一次最多导出 20 个项目" }, { status: 400 });
    }

    const results: Array<{
      projectId: string;
      title: string;
      status: string;
      finalReport: boolean;
      codegenRuns: Array<{ target: string; status: string; downloadUrl: string | null; sqlDownloadUrl: string | null }>;
    }> = [];

    for (const id of ids) {
      const access = await fetchProjectWithAccess(id, "id, title, status, final_report");
      if (!access.ok) continue;
      const project = access.project as Record<string, unknown>;

      const runs = await listCodegenRuns(id, 10);
      const enriched = await enrichCodegenRuns(runs, id);

      results.push({
        projectId: id,
        title: (project.title as string) ?? "未命名",
        status: (project.status as string) ?? "unknown",
        finalReport: !!project.final_report,
        codegenRuns: enriched.map((r) => ({
          target: r.target,
          status: r.status,
          downloadUrl: r.downloadUrl,
          sqlDownloadUrl: r.sqlDownloadUrl,
        })),
      });
    }

    return NextResponse.json({ exported: results.length, results });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "导出失败" }, { status: 500 });
  }
}
