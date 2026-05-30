/**
 * D2+GitHub：三栈仓库名与 push 路由静态验收
 * npm run verify:github:three-stacks
 */
import fs from "fs";
import path from "path";

const root = process.cwd();

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

console.log("══ GitHub 三栈 push ══\n");

const repoName = read("lib/github/repo-name.ts");
for (const [target, suffix] of [
  ["flutter", "-flutter"],
  ["wechat", "-wechat"],
  ["harmony", "-harmony"]
]) {
  if (!repoName.includes(`"${suffix}"`) && !repoName.includes(`'${suffix}'`)) {
    console.error(`❌ repo-name 缺少 ${target} 后缀 ${suffix}`);
    process.exit(1);
  }
  console.log(`✓ ${target} → *${suffix}`);
}

const required = [
  "app/api/projects/[id]/codegen/github-push-all/route.ts",
  "app/api/projects/[id]/codegen/runs/[runId]/github-push/route.ts",
  "lib/github/push-codegen-run.ts",
  "lib/codegen/ensure-completed-runs.ts",
  "lib/github/push-artifact.ts",
  "lib/github/push-token.ts",
  "scripts/push-github-three-stacks.ts",
  "components/GitHubConnectButton.tsx",
  "components/CodegenPanel.tsx"
];
for (const rel of required) {
  if (!fs.existsSync(path.join(root, rel))) {
    console.error(`❌ 缺少 ${rel}`);
    process.exit(1);
  }
  console.log(`✓ ${rel}`);
}

const panel = read("components/CodegenPanel.tsx");
if (!panel.includes("github-push-all") && !panel.includes("一键推三栈")) {
  console.error("❌ CodegenPanel 无一键三栈 push");
  process.exit(1);
}

console.log(`
用法：
  npm run push:github:three-stacks -- <projectId>
  npm run release:d3 -- --push <projectId>
  项目页「一键推三栈 GitHub」（缺 run 时会同步 codegen）
`);

console.log("✅ verify:github:three-stacks 通过");
