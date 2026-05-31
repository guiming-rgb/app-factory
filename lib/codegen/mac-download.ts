import {
  deliverMacViaGithubArtifacts,
  githubActionsRunArtifactsUrl
} from "@/lib/github/desktop-gha-config";

export function resolveMacGithubUrl(metadata: Record<string, unknown>): string | null {
  const direct =
    typeof metadata.desktopMacGithubUrl === "string"
      ? metadata.desktopMacGithubUrl
      : null;
  if (direct) return direct;

  const gha = metadata.desktopGha as
    | { desktopMacGithubUrl?: string; workflowRunId?: number }
    | undefined;
  if (typeof gha?.desktopMacGithubUrl === "string") {
    return gha.desktopMacGithubUrl;
  }
  if (gha?.workflowRunId) {
    return githubActionsRunArtifactsUrl(gha.workflowRunId);
  }
  return null;
}

export function shouldUseMacGithubDownload(metadata: Record<string, unknown>): boolean {
  if (metadata.desktopMacOnGithub === true) return true;
  return deliverMacViaGithubArtifacts();
}
