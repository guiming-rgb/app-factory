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
