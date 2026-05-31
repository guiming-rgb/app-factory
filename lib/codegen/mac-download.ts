import {
  deliverMacViaGithubArtifacts,
  githubActionsRunArtifactsUrl
} from "@/lib/github/desktop-gha-config";

function workflowRunIdFromHtmlUrl(htmlUrl: string): number | null {
  const m = htmlUrl.match(/\/actions\/runs\/(\d+)/);
  if (!m?.[1]) return null;
  const id = Number(m[1]);
  return Number.isFinite(id) ? id : null;
}

export function resolveMacGithubUrl(metadata: Record<string, unknown>): string | null {
  const direct =
    typeof metadata.desktopMacGithubUrl === "string"
      ? metadata.desktopMacGithubUrl
      : null;
  if (direct) return direct;

  const gha = metadata.desktopGha as
    | {
        desktopMacGithubUrl?: string;
        workflowRunId?: number;
        htmlUrl?: string;
      }
    | undefined;

  if (typeof gha?.desktopMacGithubUrl === "string") {
    return gha.desktopMacGithubUrl;
  }
  if (gha?.workflowRunId) {
    return githubActionsRunArtifactsUrl(gha.workflowRunId);
  }
  if (typeof gha?.htmlUrl === "string") {
    const runId = workflowRunIdFromHtmlUrl(gha.htmlUrl);
    if (runId) return githubActionsRunArtifactsUrl(runId);
  }
  return null;
}

/** 生产站 Mac 包约 50MB，不走工厂 /download?kind=macos */
export function shouldUseMacGithubDownload(
  metadata: Record<string, unknown>
): boolean {
  if (metadata.desktopMacOnGithub === true) return true;
  if (resolveMacGithubUrl(metadata)) return true;
  return deliverMacViaGithubArtifacts();
}
