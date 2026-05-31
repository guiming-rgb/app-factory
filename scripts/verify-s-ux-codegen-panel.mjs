/**
 * 批次 S：Codegen 面板 UX 静态探针
 * npm run verify:s:ux
 */
import fs from "fs";
import path from "path";

const root = process.cwd();
const panel = fs.readFileSync(
  path.join(root, "components/CodegenPanel.tsx"),
  "utf8"
);
const quality = fs.readFileSync(
  path.join(root, "lib/codegen/format-run-quality.ts"),
  "utf8"
);

const required = [
  ["CodegenPanel", "同步生成", panel],
  ["CodegenPanel", "failureRemediation", panel],
  ["CodegenPanel", "CopyTextButton", panel],
  ["CodegenPanel", "复制下载链", panel],
  ["CodegenPanel", "复制完整日志", panel],
  ["format-run-quality", "failureRemediation", quality]
];

console.log("══ S UX 静态探针 ══\n");
for (const [file, needle, text] of required) {
  if (!text.includes(needle)) {
    console.error(`❌ ${file} 缺少「${needle}」`);
    process.exit(1);
  }
  console.log(`✓ ${file} · ${needle}`);
}
console.log("\n✅ verify:s:ux 通过\n");
