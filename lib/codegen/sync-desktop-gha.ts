import { artifactExists } from "@/lib/codegen/artifacts";
import {
  finalizeDesktopGhaArtifacts,
  pollDesktopGhaOnce
} from "@/lib/codegen/desktop-gha-orchestrator";
import {
  mergeCodegenRunMetadata,
  mergeCodegenRunNestedMetadata
} from "@/lib/codegen/merge-run-metadata";
import { resolveMacGithubUrl } from "@/lib/codegen/mac-download";
import type { CodegenRunRow } from "@/lib/codegen/runs";
import {
  githubActionsRunArtifactsUrl,
  isDesktopGhaEnabled
} from "@/lib/github/desktop-gha-config";

type DesktopGhaMeta = {
  status?: string;
  workflowRunId?: number;
  htmlUrl?: string;
};

function resolveAppName(metadata: Record<string, unknown>): string {
  const fileName = metadata.fileName;
  if (typeof fileName === "string" && fileName.endsWith("-flutter.zip")) {
    return fileName.slice(0, -"-flutter.zip".length);
  }
  return "app_factory_minimal";
}

async function hasStoredArtifact(path: string | null | undefined): Promise<boolean> {
  if (!path || typeof path !== "string") return false;
  return artifactExists(path);
}

/** 刷新列表时：若 GHA 已跑完而 Inngest 未回传，则从 GitHub 拉产物并写入下载路径 */
export async function syncDesktopGhaIfNeeded(run: CodegenRunRow): Promise<boolean> {
  if (!isDesktopGhaEnabled()) return false;
  if (run.target !== "flutter" || run.status !== "completed") return false;

  const metadata = (run.metadata ?? {}) as Record<string, unknown>;
  const gha = metadata.desktopGha as DesktopGhaMeta | undefined;
  if (!gha?.workflowRunId) return false;

  const workflowRunId = gha.workflowRunId;
  const appName = resolveAppName(metadata);
  const status = gha.status;

  const macPath =
    typeof metadata.desktopMacArtifactPath === "string"
      ? metadata.desktopMacArtifactPath
      : null;
  const winPath =
    typeof metadata.desktopWinArtifactPath === "string"
      ? metadata.desktopWinArtifactPath
      : null;

  const hasMacStored = await hasStoredArtifact(macPath);
  const hasMacGithub = metadata.desktopMacOnGithub === true;
  const hasMac = hasMacStored || hasMacGithub;
  const hasWin = await hasStoredArtifact(winPath);

  if (status === "completed" && hasMac && hasWin) {
    return false;
  }

  if (
    status === "completed" &&
    hasWin &&
    !resolveMacGithubUrl(metadata) &&
    workflowRunId
  ) {
    const url = githubActionsRunArtifactsUrl(workflowRunId);
    if (url) {
      await mergeCodegenRunMetadata(run.id, {
        desktopMacOnGithub: true,
        desktopMacGithubUrl: url
      });
      await mergeCodegenRunNestedMetadata(run.id, "desktopGha", {
        desktopMacOnGithub: true,
        desktopMacGithubUrl: url,
        message:
          "Win 包已在本页下载；Mac .app 约 50MB，请点「Mac(GitHub)」在 Artifacts 下载"
      });
      return true;
    }
  }

  if (status === "completed" && (hasMacStored || hasWin)) {
    const onlyPlatforms: Array<"macos" | "windows"> = [];
    if (!hasWin) onlyPlatforms.push("windows");
    if (!hasMacGithub && !hasMacStored) {
      /* Vercel 上 Mac 只记 GitHub 链，不拉 50MB blob */
      onlyPlatforms.push("macos");
    }
    await finalizeDesktopGhaArtifacts({
      runId: run.id,
      appName,
      workflowRunId,
      onlyPlatforms,
      existingMacPath: hasMacStored ? macPath : null,
      existingWinPath: hasWin ? winPath : null
    });
    return true;
  }

  if (status === "failed") {
    return false;
  }

  const state = await pollDesktopGhaOnce(workflowRunId);
  if (state === "pending") {
    if (status !== "running") {
      await mergeCodegenRunNestedMetadata(run.id, "desktopGha", {
        status: "running",
        workflowRunId,
        message: "GitHub Actions 正在构建 Mac .app 与 Windows .exe…"
      });
    }
    return false;
  }

  if (state === "failure") {
    await mergeCodegenRunNestedMetadata(run.id, "desktopGha", {
      status: "failed",
      workflowRunId,
      message: "GitHub Actions 桌面构建失败，见 Actions 日志"
    });
    return true;
  }

  await finalizeDesktopGhaArtifacts({
    runId: run.id,
    appName,
    workflowRunId,
    existingMacPath: hasMacStored ? macPath : null,
    existingWinPath: hasWin ? winPath : null
  });
  return true;
}

async function backfillMacGithubLink(run: CodegenRunRow): Promise<void> {
  if (run.target !== "flutter" || run.status !== "completed") return;
  const metadata = (run.metadata ?? {}) as Record<string, unknown>;
  if (resolveMacGithubUrl(metadata)) return;

  const gha = metadata.desktopGha as DesktopGhaMeta | undefined;
  const workflowRunId = gha?.workflowRunId;
  if (!workflowRunId) return;

  const url = githubActionsRunArtifactsUrl(workflowRunId);
  if (!url) return;

  await mergeCodegenRunMetadata(run.id, {
    desktopMacOnGithub: true,
    desktopMacGithubUrl: url
  });
  await mergeCodegenRunNestedMetadata(run.id, "desktopGha", {
    desktopMacOnGithub: true,
    desktopMacGithubUrl: url
  });
}

export async function syncDesktopGhaForRuns(runs: CodegenRunRow[]): Promise<void> {
  const flutterDone = runs.filter(
    (r) => r.target === "flutter" && r.status === "completed"
  );

  for (const run of flutterDone.slice(0, 8)) {
    try {
      await backfillMacGithubLink(run);
    } catch {
      /* 忽略 */
    }
  }

  const candidates = flutterDone.filter((r) => {
    const gha = (r.metadata as { desktopGha?: DesktopGhaMeta } | null)
      ?.desktopGha;
    return !!gha?.workflowRunId;
  });

  for (const run of candidates.slice(0, 3)) {
    try {
      await syncDesktopGhaIfNeeded(run);
    } catch (err: unknown) {
      console.warn(
        "[sync-desktop-gha]",
        run.id,
        err instanceof Error ? err.message : err
      );
    }
  }
}
