import { NextRequest, NextResponse } from "next/server";

import {
  artifactExists,
  readPreviewHtml
} from "@/lib/codegen/artifacts";
import { getCodegenRun } from "@/lib/codegen/runs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string; runId: string } }
) {
  try {
    const { id: projectId, runId } = params;
    const run = await getCodegenRun(runId);

    if (!run || run.project_id !== projectId) {
      return NextResponse.json({ error: "codegen 记录不存在" }, { status: 404 });
    }

    if (run.status !== "completed") {
      return NextResponse.json(
        { error: "预览尚未就绪", status: run.status },
        { status: 409 }
      );
    }

    const meta = (run.metadata ?? {}) as { previewPath?: string };
    const previewPath = meta.previewPath;
    if (!previewPath || !(await artifactExists(previewPath))) {
      return NextResponse.json({ error: "预览文件不存在" }, { status: 410 });
    }

    const html = await readPreviewHtml(previewPath);
    return new NextResponse(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "X-Codegen-Run-Id": runId,
        "Cache-Control": "private, max-age=300"
      }
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "预览加载失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
