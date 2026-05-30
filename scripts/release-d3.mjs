/**
 * D3 固定发版节奏
 * npm run release:d3
 * npm run release:d3 -- --push <projectId>   # 发版后自动三栈 push
 * npm run release:d3 -- --skip-deploy
 */
import { spawnSync } from "child_process";

const args = process.argv.slice(2);
const skipDeploy = args.includes("--skip-deploy");
const pushIdx = args.indexOf("--push");
const pushProjectId =
  pushIdx >= 0 ? args[pushIdx + 1]?.trim() : process.env.D3_PUSH_PROJECT_ID?.trim();

function run(script, extraArgs = [], { allowFail = false } = {}) {
  const r = spawnSync("npm", ["run", script, ...extraArgs], {
    stdio: "inherit",
    encoding: "utf8"
  });
  const code = r.status ?? 1;
  if (code !== 0 && !allowFail) {
    process.exit(code);
  }
  return code;
}

function runNode(script, scriptArgs = [], { allowFail = false } = {}) {
  const r = spawnSync("npx", ["tsx", script, ...scriptArgs], {
    stdio: "inherit",
    encoding: "utf8"
  });
  const code = r.status ?? 1;
  if (code !== 0 && !allowFail) {
    process.exit(code);
  }
  return code;
}

console.log("══ D3 发版节奏 ══\n");

const steps = [
  ["build", "1/7 build"],
  ["verify:v4:batch:local", "2/7 batch:local"],
  ["verify:inngest:codegen", "3/7 inngest:codegen"],
  ["verify:c6:harmony", "4/7 c6:harmony"],
  ["verify:github:three-stacks", "5/7 github:three-stacks"],
  ["verify:codegen:stability", "6/7 codegen:stability"]
];

for (const [script, label] of steps) {
  console.log(`\n── ${label} ──\n`);
  if (run(script) !== 0) process.exit(1);
}

if (!skipDeploy) {
  console.log("\n── 7/7 deploy:vercel ──\n");
  const dep = spawnSync("npm", ["run", "deploy:vercel"], {
    stdio: "inherit",
    encoding: "utf8"
  });
  if ((dep.status ?? 1) !== 0) {
    console.error("❌ deploy:vercel 失败");
    process.exit(dep.status ?? 1);
  }
} else {
  console.log("\n── 7/7 deploy:vercel（跳过 --skip-deploy）──\n");
}

if (pushProjectId) {
  console.log("\n── 三栈 GitHub push ──\n");
  if (runNode("scripts/push-github-three-stacks.ts", [pushProjectId]) !== 0) {
    process.exit(1);
  }
} else {
  console.log(
    "\nℹ️  未指定 --push <projectId>，跳过三栈 GitHub（可设 D3_PUSH_PROJECT_ID）"
  );
}

console.log("\n✅ release:d3 完成");
