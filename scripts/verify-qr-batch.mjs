/**
 * 批次 Q 门禁（本地 + 可选生产）
 * npm run verify:qr:batch
 * QR_SKIP_PRODUCTION=1 跳过 P1 / v3 / ZIP
 */
import { spawnSync } from "child_process";

const root = process.cwd();
const skipProd = process.env.QR_SKIP_PRODUCTION === "1";

function run(label, script) {
  console.log(`\n── ${label} ──\n`);
  const r = spawnSync("npm", ["run", script], {
    cwd: root,
    stdio: "inherit",
    env: process.env,
    shell: false
  });
  if (r.status !== 0) {
    process.exit(r.status ?? 1);
  }
}

console.log("══ 批次 Q 门禁 ══\n");

run("Q0 i0", "verify:i0:batch");
run("Q0 桌面 Flutter", "verify:p:desktop:flutter");
run("Q0 鸿蒙 C6", "verify:c6:harmony");
run("R0 稳定静态", "verify:codegen:stability");

if (!skipProd) {
  run("Q1 v3 轻量", "verify:v3:production:quick");
  run("Q1 P1 三栈", "verify:p1:production:sync:all");
  run("Q3 ZIP 内容", "verify:qr:production:artifacts");
} else {
  console.log("\n（已跳过生产探针 QR_SKIP_PRODUCTION=1）\n");
}

console.log("✅ verify:qr:batch 全部通过\n");
