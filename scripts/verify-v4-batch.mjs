/**
 * v4 批量验收：静态门禁 + 生产探针
 * npm run verify:v4:batch
 */
import { spawnSync } from "child_process";

const STEPS = [
  ["verify:v4:owner-api", "API owner 守卫"],
  ["verify:v4:inngest-auth", "Inngest userId"],
  ["verify:v4:rate-limit", "限流接线"],
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
