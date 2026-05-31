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
  getDesktopGhaConfig,
  isDesktopGhaEnabled
} from "@/lib/github/desktop-gha-config";
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
}): Promise<{ macPath?: string; winPath?: string }> {
  const blobs = await downloadDesktopGhaArtifacts(
    input.workflowRunId,
    input.runId
  );

  let macPath: string | undefined;
  let winPath: string | undefined;

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

  const patch: Record<string, unknown> = {
    status: macPath || winPath ? "completed" : "failed",
    completedAt: new Date().toISOString(),
    ...(macPath ? { desktopMacArtifactPath: macPath } : {}),
    ...(winPath ? { desktopWinArtifactPath: winPath } : {}),
    message:
      macPath && winPath
        ? "Mac .app 与 Windows .exe 包已就绪"
        : macPath
          ? "Mac .app 已就绪（Windows 构建失败或未上传）"
          : winPath
            ? "Windows 包已就绪（Mac 构建失败或未上传）"
            : "未从 GHA 下载到桌面产物"
  };

  await mergeCodegenRunNestedMetadata(input.runId, "desktopGha", patch);

  await mergeCodegenRunMetadata(input.runId, {
    ...(macPath ? { desktopMacArtifactPath: macPath } : {}),
    ...(winPath ? { desktopWinArtifactPath: winPath } : {})
  });

  if (macPath || winPath) {
    await mergeCodegenRunNestedMetadata(input.runId, "desktopBuild", {
      macos: {
        status: macPath ? "passed" : "skipped",
        fileName: `${input.appName}-macos.app.zip`
      },
      windows: {
        status: winPath ? "passed" : "skipped",
        fileName: `${input.appName}-windows.zip`
      }
    });
  }

  return { macPath, winPath };
}

export async function pollDesktopGhaOnce(
  workflowRunId: number
): Promise<"pending" | "success" | "failure"> {
  const poll = await pollDesktopGhaWorkflow(workflowRunId);
  if (poll.status !== "completed") return "pending";
  if (poll.conclusion === "success") return "success";
  return "failure";
}
