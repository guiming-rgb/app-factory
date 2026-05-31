/**
 * 批次 P：Flutter 含 macOS / Windows 桌面平台
 * npm run verify:p:desktop:flutter
 */
import fs from "fs";
import { spawnSync } from "child_process";

const root = process.cwd();

function assert(cond, msg) {
  if (!cond) {
    console.error(`❌ ${msg}`);
    process.exit(1);
  }
}

console.log("══ P 桌面 Flutter 平台 ══\n");

for (const dir of ["macos", "windows"]) {
  assert(
    fs.existsSync(`${root}/templates/flutter-minimal/${dir}`),
    `模板缺少 ${dir}/`
  );
  console.log(`✓ 模板含 ${dir}/`);
}

const r = spawnSync(
  "npx",
  [
    "tsx",
    "scripts/codegen-flutter.ts",
    "--spec",
    "docs/schemas/examples/valid-minimal.json",
    "--out",
    "/tmp/app-factory-p-desktop-flutter"
  ],
  { cwd: root, encoding: "utf8" }
);
if (r.status !== 0) {
  console.error(r.stderr || r.stdout);
  process.exit(1);
}

const out = "/tmp/app-factory-p-desktop-flutter";
for (const dir of ["macos", "windows"]) {
  assert(fs.existsSync(`${out}/${dir}`), `生成物缺少 ${dir}/`);
  console.log(`✓ 生成物含 ${dir}/`);
}

const spec = JSON.parse(
  fs.readFileSync("docs/schemas/examples/valid-minimal.json", "utf8")
);
assert(
  spec.targets.flutter.platforms.includes("macos") &&
    spec.targets.flutter.platforms.includes("windows"),
  "valid-minimal Spec 未含 macos/windows"
);
console.log("✓ Spec 含 macos + windows");

console.log("\n✅ verify:p:desktop:flutter 通过\n");
