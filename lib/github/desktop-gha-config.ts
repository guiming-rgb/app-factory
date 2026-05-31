/** GitHub Actions 桌面双平台构建（网页触发 → GHA → 回传下载链） */

export type DesktopGhaConfig = {
  token: string;
  owner: string;
  repo: string;
  workflowFile: string;
  ref: string;
};

export function getDesktopGhaConfig(): DesktopGhaConfig | null {
  const token =
    process.env.GITHUB_DESKTOP_GHA_TOKEN?.trim() ||
    process.env.GITHUB_PAT?.trim();
  const repoFull =
    process.env.GITHUB_DESKTOP_GHA_REPO?.trim() ||
    process.env.GITHUB_REPOSITORY?.trim() ||
    "guiming-rgb/app-factory";
  if (!token) return null;
  const [owner, repo] = repoFull.split("/");
  if (!owner || !repo) return null;
  return {
    token,
    owner,
    repo,
    workflowFile:
      process.env.GITHUB_DESKTOP_GHA_WORKFLOW?.trim() ||
      "flutter-desktop-dual-build.yml",
    ref: process.env.GITHUB_DESKTOP_GHA_REF?.trim() || "main"
  };
}

export function isDesktopGhaEnabled(): boolean {
  if (process.env.CODEGEN_DESKTOP_GHA_DISABLED === "1") return false;
  if (!getDesktopGhaConfig()) return false;
  if (process.env.CODEGEN_DESKTOP_GHA_ENABLED === "1") return true;
  /** Vercel 生产：有 token 则默认走 GHA 桌面构建 */
  if (process.env.VERCEL === "1") return true;
  return false;
}

export function preferDesktopGhaOverLocalBuild(): boolean {
  return isDesktopGhaEnabled() && process.env.VERCEL === "1";
}

/**
 * Mac .app.zip 约 50MB+，Vercel 函数响应上限约 4.5MB，生产站 Mac 走 GitHub Artifacts 直链。
 */
export function deliverMacViaGithubArtifacts(): boolean {
  const raw = process.env.CODEGEN_DESKTOP_MAC_VIA_GITHUB?.trim();
  if (raw === "0") return false;
  if (raw === "1") return true;
  return process.env.VERCEL === "1";
}

export function githubActionsRunArtifactsUrl(workflowRunId: number): string | null {
  const cfg = getDesktopGhaConfig();
  if (!cfg || !workflowRunId) return null;
  return `https://github.com/${cfg.owner}/${cfg.repo}/actions/runs/${workflowRunId}#artifacts`;
}
