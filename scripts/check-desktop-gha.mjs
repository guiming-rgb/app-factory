/**
 * 检查 GitHub Actions 桌面构建环境变量（本地 / CI）
 * npm run check:desktop:gha
 */
const token =
  process.env.GITHUB_DESKTOP_GHA_TOKEN?.trim() ||
  process.env.GITHUB_PAT?.trim();
const repo =
  process.env.GITHUB_DESKTOP_GHA_REPO?.trim() || "guiming-rgb/app-factory";

console.log("══ 桌面 GHA 环境检查 ══\n");

if (!token) {
  console.error("❌ 未设置 GITHUB_DESKTOP_GHA_TOKEN（或 GITHUB_PAT）");
  process.exit(1);
}
console.log("✓ Token 已配置（长度", token.length, "）");

if (!repo.includes("/")) {
  console.error("❌ GITHUB_DESKTOP_GHA_REPO 格式应为 owner/repo");
  process.exit(1);
}
console.log("✓ 目标仓库", repo);

const workflow =
  process.env.GITHUB_DESKTOP_GHA_WORKFLOW?.trim() ||
  "flutter-desktop-dual-build.yml";
console.log("✓ Workflow", workflow);

if (process.env.CODEGEN_DESKTOP_GHA_DISABLED === "1") {
  console.warn("⚠ CODEGEN_DESKTOP_GHA_DISABLED=1，生产将不会自动触发 GHA");
}

console.log("\n✅ check:desktop:gha 通过\n");
