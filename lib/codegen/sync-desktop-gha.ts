import {
  finalizeDesktopGhaArtifacts,
  pollDesktopGhaOnce
} from "@/lib/codegen/desktop-gha-orchestrator";
import { mergeCodegenRunNestedMetadata } from "@/lib/codegen/merge-run-metadata";
import type { CodegenRunRow } from "@/lib/codegen/runs";
import { isDesktopGhaEnabled } from "@/lib/github/desktop-gha-config";

type DesktopGhaMeta = {
  status?: string;
  workflowRunId?: number;
};

function resolveAppName(metadata: Record<string, unknown>): string {
  const fileName = metadata.fileName;
  if (typeof fileName === "string" && fileName.endsWith("-flutter.zip")) {
    return fileName.slice(0, -"-flutter.zip".length);
  }
  return "app_factory_minimal";
}

/** 刷新列表时：若 GHA 已跑完而 Inngest 未回传，则从 GitHub 拉产物并写入下载路径 */
export async function syncDesktopGhaIfNeeded(run: CodegenRunRow): Promise<boolean> {
  if (!isDesktopGhaEnabled()) return false;
  if (run.target !== "flutter" || run.status !== "completed") return false;

  const metadata = (run.metadata ?? {}) as Record<string, unknown>;
  const gha = metadata.desktopGha as DesktopGhaMeta | undefined;
  if (!gha?.workflowRunId) return false;

  const status = gha.status;
  if (status === "completed" || status === "failed") return false;

  const workflowRunId = gha.workflowRunId;
  const appName = resolveAppName(metadata);

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
    workflowRunId
  });
  return true;
}

export async function syncDesktopGhaForRuns(runs: CodegenRunRow[]): Promise<void> {
  const pending = runs.filter((r) => {
    if (r.target !== "flutter" || r.status !== "completed") return false;
    const gha = (r.metadata as { desktopGha?: DesktopGhaMeta } | null)
      ?.desktopGha;
    const s = gha?.status;
    return (
      !!gha?.workflowRunId &&
      s !== "completed" &&
      s !== "failed"
    );
  });

  const slice = pending.slice(0, 5);
  for (const run of slice) {
    try {
      await syncDesktopGhaIfNeeded(run);
    } catch {
      /* 单条失败不阻塞列表 */
    }
  }
}
