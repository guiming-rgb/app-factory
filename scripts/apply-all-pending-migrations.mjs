/**
 * 一次性应用 HANDOFF 列出的待跑 migration（幂等脚本会自行跳过已应用项）
 * npm run db:apply:all-pending
 */
import { spawnSync } from "child_process";

const STEPS = [
  { label: "9 Agent 安全合规", script: "db:apply:security-compliance-agent" },
];

function runNpmScript(name) {
  const r = spawnSync("npm", ["run", name], {
    stdio: "inherit",
    env: process.env,
    shell: process.platform === "win32",
  });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

console.log("══ 应用全部待跑 Supabase migration ══\n");

for (const step of STEPS) {
  console.log(`→ ${step.label} (${step.script})`);
  runNpmScript(step.script);
}

console.log("\n✅ 全部待跑 migration 脚本已执行完毕");
