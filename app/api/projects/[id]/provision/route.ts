import { NextRequest, NextResponse } from "next/server";

import { fetchProjectWithAccess } from "@/lib/auth/require-project-access";
import { buildSpecForProject } from "@/lib/app-spec/from-report";
import { generateCreateTableDDL } from "@/lib/app-spec/generate-ddl";
import { provisionSupabaseBackend } from "@/lib/supabase/provision";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST: 一键部署 Supabase 后端（建表 + RLS）
 * P0: Supabase 自动化
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const projectId = params.id;

  try {
    const access = await fetchProjectWithAccess<{
      id: string;
      title: string;
      idea: string;
      final_report: string | null;
      spec_override: unknown;
    }>(projectId, "id, title, idea, final_report, spec_override");
    if (!access.ok) return access.response;

    const project = access.project;

    // 构建 Spec 并生成 DDL
    const buildResult = await buildSpecForProject({
      id: project.id,
      title: project.title ?? "未命名",
      idea: project.idea,
      final_report: project.final_report,
    });

    const ddl = generateCreateTableDDL(buildResult.spec);
    const appName = buildResult.spec.appName;

    // 执行部署
    const result = await provisionSupabaseBackend({
      appName,
      sql: ddl.fullSql,
    });

    return NextResponse.json({
      ok: result.ok,
      tablesCreated: result.tablesCreated,
      sqlExecuted: result.sqlExecuted,
      sqlPreview: ddl.fullSql.slice(0, 3000),
      errors: result.errors,
      hint: result.ok
        ? `已创建 ${result.tablesCreated.length} 张表`
        : "DDL 已生成。请复制 sqlPreview 到 Supabase SQL Editor 中手动执行。",
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "部署失败" },
      { status: 500 }
    );
  }
}
