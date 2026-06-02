import { NextRequest, NextResponse } from "next/server";

import { fetchProjectWithAccess } from "@/lib/auth/require-project-access";
import { readArtifactFile } from "@/lib/codegen/artifacts";

export const runtime = "nodejs";

/**
 * GET: 下载 codegen run 对应的 Supabase 建表 SQL
 * P1: 后端 SQL 生成
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string; runId: string } }
) {
  try {
    const projectId = params.id;
    const runId = params.runId;

    if (!runId || typeof runId !== "string" || runId.length < 10) {
      return NextResponse.json({ error: "无效 runId" }, { status: 400 });
    }

    const access = await fetchProjectWithAccess<{
      id: string;
    }>(projectId, "id");
    if (!access.ok) {
      return access.response;
    }

    const relativePath = `${runId}/supabase_migration.sql`;
    const buffer = await readArtifactFile(relativePath);

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": `attachment; filename="supabase_migration.sql"`
      }
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "SQL 下载失败";
    if (message.includes("不存在")) {
      return NextResponse.json({ error: "SQL 文件不存在" }, { status: 404 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
