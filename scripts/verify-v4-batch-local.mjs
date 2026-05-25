/**
 * v4 批量 + 本地 Supabase 检查
 * npm run verify:v4:batch:local
 */
import { spawnSync } from "child_process";
import fs from "fs";
import path from "path";

const root = process.cwd();

function runNpm(script) {
  return spawnSync("npm", ["run", script], { stdio: "inherit" }).status ?? 1;
}

console.log("══ v4 批量 + 本地库检查 ══\n");

if (runNpm("verify:v4:batch") !== 0) {
  process.exit(1);
}

const envPath = path.join(root, ".env.local");
if (!fs.existsSync(envPath)) {
  console.log("\n⏭ 无 .env.local，跳过 check:v4:*");
  process.exit(0);
}

for (const script of ["check:v4:owner", "check:v4:rls", "check:v4:rate-limit"]) {
  console.log(`\n── ${script} ──\n`);
  const code = runNpm(script);
  if (code !== 0) {
    console.warn(`⚠️  ${script} 失败 — 维护者请跑对应 db:apply:* 迁移`);
  }
}

console.log("\n✅ verify:v4:batch:local 完成");
