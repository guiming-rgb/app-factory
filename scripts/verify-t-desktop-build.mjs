/**
 * 批次 T：桌面可双击发行包（静态）
 * npm run verify:t:desktop:build
 */
import fs from "fs";
import path from "path";

const root = process.cwd();
const checks = [
  "lib/sandbox/flutter-desktop-build.ts",
  "lib/flutter-codegen/attach-desktop-releases.ts",
  ".github/workflows/flutter-desktop-dual-build.yml",
  "docs/桌面可双击发行包.md"
];

console.log("══ T 桌面发行包（静态）══\n");
for (const rel of checks) {
  if (!fs.existsSync(path.join(root, rel))) {
    console.error(`❌ 缺少 ${rel}`);
    process.exit(1);
  }
  console.log(`✓ ${rel}`);
}

const download = fs.readFileSync(
  path.join(root, "app/api/projects/[id]/codegen/runs/[runId]/download/route.ts"),
  "utf8"
);
if (!download.includes("kind=macos") && !download.includes('kind === "macos"')) {
  console.error("❌ download 路由未支持 kind=macos/windows");
  process.exit(1);
}
console.log("✓ download ?kind=macos|windows");

const panel = fs.readFileSync(
  path.join(root, "components/CodegenPanel.tsx"),
  "utf8"
);
if (!panel.includes("downloadMacUrl")) {
  console.error("❌ CodegenPanel 缺 downloadMacUrl");
  process.exit(1);
}
console.log("✓ CodegenPanel 桌面下载链");

console.log("\n✅ verify:t:desktop:build 通过\n");
