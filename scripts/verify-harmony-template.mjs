/**
 * Harmony 模板结构验收
 * node scripts/verify-harmony-template.mjs <dir>
 */
import fs from "fs";
import path from "path";

const dir = process.argv[2];
if (!dir || !fs.existsSync(dir)) {
  console.error("用法: node scripts/verify-harmony-template.mjs <工程目录>");
  process.exit(1);
}

const required = [
  "AppScope/app.json5",
  "entry/src/main/module.json5",
  "entry/src/main/ets/pages/Index.ets",
  "entry/src/main/ets/entryability/EntryAbility.ets",
  "oh-package.json5",
  "build-profile.json5",
  "app_spec.json"
];

console.log("══ verify:harmony 模板 ══\n");
console.log(`目录: ${dir}\n`);

let ok = 0;
for (const rel of required) {
  const p = path.join(dir, rel);
  if (!fs.existsSync(p)) {
    console.error(`✗ 缺少 ${rel}`);
    process.exit(1);
  }
  ok++;
}
console.log(`✓ 必需文件 ${ok}/${required.length}`);

const index = fs.readFileSync(
  path.join(dir, "entry/src/main/ets/pages/Index.ets"),
  "utf8"
);
if (index.includes("__DISPLAY_NAME__")) {
  console.error("✗ Index.ets 仍含占位符 __DISPLAY_NAME__");
  process.exit(1);
}
console.log("✓ Index.ets 已注入 displayName");

const mainPagesPath = path.join(
  dir,
  "entry/src/main/resources/base/profile/main_pages.json"
);
if (fs.existsSync(mainPagesPath)) {
  const mp = JSON.parse(fs.readFileSync(mainPagesPath, "utf8"));
  const count = (mp.src ?? []).length;
  console.log(`✓ main_pages ${count} 页`);
  for (const route of mp.src ?? []) {
    const ets = path.join(dir, "entry/src/main/ets", `${route}.ets`);
    if (!fs.existsSync(ets)) {
      console.error(`✗ 缺少 ${route}.ets`);
      process.exit(1);
    }
  }
}

console.log("\n✅ verify:harmony 通过");
