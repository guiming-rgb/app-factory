/**
 * I0：合并批次 H 探针为一条门禁（CI / 发版前）
 * npm run verify:i0:batch
 */
import { spawnSync } from "child_process";

const steps = [
  ["verify:todo:parity", "E2 待办三栈"],
  ["verify:g2:entity-scaffold", "G2 实体列表"],
  ["verify:g3:persistence", "H3 持久化"],
  ["verify:h4:shooter", "H4 枪战 Spec"],
  ["verify:c6:harmony", "C6 鸿蒙"],
  ["verify:c4:github:push-unit", "C4 push 单元"],
  ["maintainer:pending", "维护者清单"]
];

console.log("══ I0 探针门禁（批次 I）══\n");

for (const [script, label] of steps) {
  console.log(`── ${label} (${script}) ──\n`);
  const r = spawnSync("npm", ["run", script], {
    stdio: "inherit",
    encoding: "utf8"
  });
  if ((r.status ?? 1) !== 0) {
    console.error(`\n❌ I0 失败于 ${script}`);
    process.exit(r.status ?? 1);
  }
  console.log("");
}

console.log("✅ verify:i0:batch 全部通过");
