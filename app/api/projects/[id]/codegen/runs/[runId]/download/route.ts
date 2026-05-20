import { NextRequest, NextResponse } from "next/server";

import { artifactExists, readArtifactFile } from "@/lib/codegen/artifacts";
import { getCodegenRun } from "@/lib/codegen/runs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function safeZipBaseName(name: string) {
  return name
    .replace(/[\\/:*?"<>|]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 50);
}

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

    if (run.status !== "completed" || !run.artifact_path) {
      return NextResponse.json(
        { error: "产物尚未就绪", status: run?.status ?? "unknown" },
        { status: 409 }
      );
    }

    if (!(await artifactExists(run.artifact_path))) {
      return NextResponse.json(
        { error: "产物文件不存在（可能服务已重启，请重新生成）" },
        { status: 410 }
      );
    }

    const buffer = await readArtifactFile(run.artifact_path);
    const meta = (run.metadata ?? {}) as { fileName?: string };
    const fileName =
      typeof meta.fileName === "string"
        ? meta.fileName
        : run.artifact_path.split("/").pop() ?? "artifact.zip";
    const encoded = encodeURIComponent(fileName);

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${safeZipBaseName(fileName)}"; filename*=UTF-8''${encoded}`,
        "X-Codegen-Run-Id": runId,
        "X-Codegen-Target": run.target,
        ...(run.spec_source ? { "X-App-Spec-Source": run.spec_source } : {})
      }
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "下载 codegen 产物失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
