/**
 * I1：Flutter analyze 沙箱策略（Spec → codegen → dart analyze，无 flutter 时跳过 analyze）
 * npm run verify:i1:flutter
 */
import { spawnSync, execSync } from "child_process";
import fs from "fs";

const root = process.cwd();
const spec = "docs/schemas/examples/valid-minimal.json";
const out = "/tmp/app-factory-i1-flutter";

function hasFlutter() {
  try {
    execSync("flutter --version", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

console.log("══ I1 Flutter analyze 沙箱 ══\n");

const gen = spawnSync(
  "npx",
  ["tsx", "scripts/codegen-flutter.ts", "--spec", spec, "--out", out],
  { cwd: root, stdio: "inherit", encoding: "utf8" }
);
if (gen.status !== 0) {
  process.exit(gen.status ?? 1);
}
console.log(`✓ codegen → ${out}\n`);

if (!hasFlutter()) {
  console.log("⏭ 未检测到 flutter/dart CLI — 仅验证 codegen 产物目录存在");
  if (!fs.existsSync(`${out}/pubspec.yaml`)) {
    console.error("❌ 缺少 pubspec.yaml");
    process.exit(1);
  }
  console.log("\n✅ verify:i1:flutter 通过（analyze 已跳过）");
  process.exit(0);
}

try {
  execSync("flutter pub get", { cwd: out, stdio: "inherit" });
  execSync("dart analyze", { cwd: out, stdio: "inherit" });
} catch {
  console.error("\n❌ dart analyze 未通过");
  process.exit(1);
}

console.log("\n✅ verify:i1:flutter 通过（含 dart analyze）");
