import type { AppSpec } from "@/lib/app-spec/types";
import { writeArtifactFile } from "@/lib/codegen/artifacts";
import {
  mergeCodegenRunMetadata,
  mergeCodegenRunNestedMetadata
} from "@/lib/codegen/merge-run-metadata";
import {
  downloadDesktopGhaArtifacts,
  pollDesktopGhaWorkflow,
  triggerDesktopGhaWorkflow
} from "@/lib/github/desktop-gha";
import {
  deliverMacViaGithubArtifacts,
  getDesktopGhaConfig,
  githubActionsRunArtifactsUrl,
  isDesktopGhaEnabled
} from "@/lib/github/desktop-gha-config";
import { ghaMacArtifactExists } from "@/lib/github/desktop-gha";
import { inngest } from "@/lib/inngest/client";

export type ScheduleDesktopGhaInput = {
  projectId: string;
  runId: string;
  appName: string;
  spec: AppSpec;
  userId?: string;
};

/** Flutter 源码 ZIP 完成后：触发 GHA 并投递 Inngest 轮询 */
export async function scheduleDesktopGhaAfterFlutter(
  input: ScheduleDesktopGhaInput
): Promise<{ scheduled: boolean; workflowRunId?: number }> {
  if (!isDesktopGhaEnabled() || !getDesktopGhaConfig()) {
    return { scheduled: false };
  }

  const triggered = await triggerDesktopGhaWorkflow({
    spec: input.spec,
    runId: input.runId,
    appName: input.appName
  });

  try {
    await inngest.send({
      name: "project/codegen.flutter.desktop-gha.requested",
      data: {
        projectId: input.projectId,
        runId: input.runId,
        appName: input.appName,
        workflowRunId: triggered.workflowRunId,
        userId: input.userId
      }
    });
  } catch {
    /* 生产未配 Inngest 时：刷新列表会通过 sync-desktop-gha 拉回产物 */
  }

  await mergeCodegenRunNestedMetadata(input.runId, "desktopGha", {
    status: "queued",
    workflowRunId: triggered.workflowRunId,
    htmlUrl: triggered.htmlUrl,
    message:
      "已触发 GitHub Actions 构建 Mac/Win 可双击包，约 10–20 分钟（页面自动刷新）"
  });

  return { scheduled: true, workflowRunId: triggered.workflowRunId };
}

/** Inngest 轮询 GHA 完成后写入 Storage 并更新 metadata 下载路径 */
export async function finalizeDesktopGhaArtifacts(input: {
  runId: string;
  appName: string;
  workflowRunId: number;
  /** 仅补拉缺失平台（刷新时 Mac 大包可能首次失败） */
  onlyPlatforms?: Array<"macos" | "windows">;
  existingMacPath?: string | null;
  existingWinPath?: string | null;
}): Promise<{ macPath?: string; winPath?: string; macOnGithub?: boolean }> {
  const macViaGithub = deliverMacViaGithubArtifacts();
  const wantMac =
    !macViaGithub &&
    (!input.onlyPlatforms || input.onlyPlatforms.includes("macos"));
  const wantWin = !input.onlyPlatforms || input.onlyPlatforms.includes("windows");

  const blobs = await downloadDesktopGhaArtifacts(
    input.workflowRunId,
    input.runId,
    {
      platforms: [
        ...(wantMac ? (["macos"] as const) : []),
        ...(wantWin ? (["windows"] as const) : [])
      ]
    }
  );

  let macPath: string | undefined = input.existingMacPath ?? undefined;
  let winPath: string | undefined = input.existingWinPath ?? undefined;
  let macOnGithub = false;

  if (macViaGithub) {
    macOnGithub = await ghaMacArtifactExists(
      input.workflowRunId,
      input.runId
    );
  }

  if (blobs.macos?.length) {
    const fileName = `${input.appName}-macos.app.zip`;
    const { relativePath } = await writeArtifactFile(
      input.runId,
      fileName,
      blobs.macos
    );
    macPath = relativePath;
  }

  if (blobs.windows?.length) {
    const fileName = `${input.appName}-windows.zip`;
    const { relativePath } = await writeArtifactFile(
      input.runId,
      fileName,
      blobs.windows
    );
    winPath = relativePath;
  }

  const macReady = !!macPath || macOnGithub;
  const artifactsUrl = githubActionsRunArtifactsUrl(input.workflowRunId);

  const patch: Record<string, unknown> = {
    status: macReady || winPath ? "completed" : "failed",
    completedAt: new Date().toISOString(),
    ...(macPath ? { desktopMacArtifactPath: macPath } : {}),
    ...(winPath ? { desktopWinArtifactPath: winPath } : {}),
    ...(macOnGithub
      ? {
          desktopMacOnGithub: true,
          desktopMacGithubUrl: artifactsUrl
        }
      : {}),
    message:
      macPath && winPath
        ? "Mac .app 与 Windows .exe 包已就绪"
        : macPath
          ? "Mac .app 已就绪（Windows 未拉回，可再点刷新记录）"
          : winPath && macOnGithub
            ? "Win 包已在本页下载；Mac .app 约 50MB，请点「Mac(GitHub)」在 Artifacts 里下载"
            : winPath
              ? "Windows 包已就绪"
              : macOnGithub
                ? "Mac 包请在 GitHub Artifacts 下载（见 Mac(GitHub) 链接）"
                : "未从 GHA 下载到桌面产物"
  };

  await mergeCodegenRunNestedMetadata(input.runId, "desktopGha", patch);

  await mergeCodegenRunMetadata(input.runId, {
    ...(macPath ? { desktopMacArtifactPath: macPath } : {}),
    ...(winPath ? { desktopWinArtifactPath: winPath } : {}),
    ...(macOnGithub
      ? {
          desktopMacOnGithub: true,
          desktopMacGithubUrl: artifactsUrl
        }
      : {})
  });

  if (macPath || winPath) {
    await mergeCodegenRunNestedMetadata(input.runId, "desktopBuild", {
      macos: {
        status: macPath || macOnGithub ? "passed" : "skipped",
        fileName: `${input.appName}-macos.app.zip`,
        ...(macOnGithub && artifactsUrl
          ? { downloadVia: "github-artifacts", url: artifactsUrl }
          : {})
      },
      windows: {
        status: winPath ? "passed" : "skipped",
        fileName: `${input.appName}-windows.zip`
      }
    });
  }

  return { macPath, winPath, macOnGithub };
}

export async function pollDesktopGhaOnce(
  workflowRunId: number
): Promise<"pending" | "success" | "failure"> {
  const poll = await pollDesktopGhaWorkflow(workflowRunId);
  if (poll.status !== "completed") return "pending";
  if (poll.conclusion === "success") return "success";
  return "failure";
}
