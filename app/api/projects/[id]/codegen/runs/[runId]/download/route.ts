import { NextRequest, NextResponse } from "next/server";

import { artifactExists, readArtifactFile } from "@/lib/codegen/artifacts";
import {
  resolveMacGithubUrl,
  shouldUseMacGithubDownload
} from "@/lib/codegen/mac-download";
import { getCodegenRun } from "@/lib/codegen/runs";
import { guardProjectAccess } from "@/lib/auth/require-project-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function safeZipBaseName(name: string) {
  return name
    .replace(/[\\/:*?"<>|]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 50);
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string; runId: string } }
) {
  try {
    const { id: projectId, runId } = params;
    const kind = req.nextUrl.searchParams.get("kind")?.trim().toLowerCase();

    const denied = await guardProjectAccess(projectId);
    if (denied) {
      return denied;
    }

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

    const meta = (run.metadata ?? {}) as Record<string, unknown> & {
      fileName?: string;
      desktopMacArtifactPath?: string;
      desktopWinArtifactPath?: string;
    };

    if (kind === "macos") {
      const macGithub = resolveMacGithubUrl(meta);
      if (macGithub) {
        return NextResponse.redirect(macGithub, 302);
      }
      if (shouldUseMacGithubDownload(meta)) {
        return NextResponse.json(
          {
            error:
              "Mac 包约 50MB，请在本页点「Mac .app(GitHub)」→ Artifacts 下载 macos- 开头的文件"
          },
          { status: 404 }
        );
      }
    }

    let relativePath = run.artifact_path;
    if (kind === "macos" && meta.desktopMacArtifactPath) {
      relativePath = meta.desktopMacArtifactPath;
    } else if (kind === "windows" && meta.desktopWinArtifactPath) {
      relativePath = meta.desktopWinArtifactPath;
    } else if (kind === "macos" || kind === "windows") {
      return NextResponse.json(
        {
          error:
            kind === "macos"
              ? "暂无 Mac 可双击包（需在 macOS 构建机生成或跑 GitHub Actions 工作流）"
              : "暂无 Windows 可双击包（需在 Windows 11 构建机生成或跑 GitHub Actions 工作流）"
        },
        { status: 404 }
      );
    }

    if (!(await artifactExists(relativePath))) {
      if (kind === "macos") {
        const macGithub = resolveMacGithubUrl(meta);
        if (macGithub) {
          return NextResponse.redirect(macGithub, 302);
        }
      }
      return NextResponse.json(
        { error: "产物文件不存在（本地与 Storage 均无，请重新生成）" },
        { status: 410 }
      );
    }

    const buffer = await readArtifactFile(relativePath);
    const fileName =
      relativePath.split("/").pop() ??
      (typeof meta.fileName === "string"
        ? meta.fileName
        : "artifact.zip");
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
