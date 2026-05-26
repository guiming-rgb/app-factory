/**
 * v4 批量验收：静态门禁 + 生产探针
 * npm run verify:v4:batch
 */
import { spawnSync } from "child_process";

const STEPS = [
  ["verify:v4:owner-api", "API owner 守卫"],
  ["verify:v4:inngest-auth", "Inngest userId"],
  ["verify:v4:rate-limit", "限流接线"],
  ["verify:v5:memories", "v5-1 记忆 API"],
  ["verify:v5:workflow", "v5-2 工作流记忆注入"],
  ["verify:v5:multi-agent-memories", "v5-6 多 Agent 记忆"],
  ["verify:v5:skills", "v5-3 Skills API"],
  ["verify:v5:skills-binding", "v5-4 Agent skill_ids"],
  ["verify:v5:memories-ui", "v5-5 记忆 UI"],
  ["verify:v5:memories-ui-v7", "v5-7 记忆类型 UI"],
  ["verify:v5:skills-admin", "v5-8 Skills 管理"],
  ["verify:c1:report-to-spec", "C1 Report→Spec 收紧"],
  ["verify:c3:wechat-compile", "C3 小程序真编译"],
  ["verify:c4:github", "C4 GitHub OAuth + push"],
  ["verify:v4:production", "生产 Auth 探针"]
];

function run(script) {
  const r = spawnSync("npm", ["run", script], {
    stdio: "inherit",
    encoding: "utf8"
  });
  return r.status ?? 1;
}

console.log("══ v4 批量验收 ══\n");

let failed = false;
for (const [script, label] of STEPS) {
  console.log(`\n── ${label} (${script}) ──\n`);
  if (run(script) !== 0) {
    failed = true;
    break;
  }
}

if (failed) {
  console.error("\n❌ v4 批量验收失败");
  process.exit(1);
}

console.log("\n✅ verify:v4:batch 全部通过");
console.log("   可选：npm run verify:v4:batch:local（含 check:v4:*）");
console.log("   可选：npm run verify:v4:production:rls（需测账号）");
console.log("   发版前重：npm run verify:v3:production（全链路，慢）");
