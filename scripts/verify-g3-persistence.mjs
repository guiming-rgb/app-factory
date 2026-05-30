/**
 * H3 待办持久化探针（三栈）
 * npm run verify:g3:persistence
 */
import fs from "fs";
import { spawnSync } from "child_process";

const root = process.cwd();
const spec = "docs/schemas/examples/valid-todo-minimal.json";

function assert(cond, msg) {
  if (!cond) {
    console.error(`❌ ${msg}`);
    process.exit(1);
  }
}

function runCodegen(script, outDir) {
  const r = spawnSync(
    "npx",
    ["tsx", script, "--spec", spec, "--out", outDir],
    { cwd: root, encoding: "utf8" }
  );
  if (r.status !== 0) {
    console.error(r.stderr || r.stdout);
    process.exit(1);
  }
}

console.log("══ H3 待办持久化 ══\n");

runCodegen("scripts/codegen-wechat.ts", "/tmp/app-factory-g3-wechat");
const wx = fs.readFileSync(
  "/tmp/app-factory-g3-wechat/pages/index/index.js",
  "utf8"
);
assert(wx.includes("getStorageSync") && wx.includes("setStorageSync"), "wechat 无 storage");
console.log("✓ 小程序 Storage");

runCodegen("scripts/codegen-flutter.ts", "/tmp/app-factory-g3-flutter");
const dart = fs.readFileSync(
  "/tmp/app-factory-g3-flutter/lib/features/todo_list/presentation/todo_list_page.dart",
  "utf8"
);
assert(dart.includes("SharedPreferences"), "flutter 无 SharedPreferences");
console.log("✓ Flutter SharedPreferences");

runCodegen("scripts/codegen-harmony.ts", "/tmp/app-factory-g3-harmony");
const ets = fs.readFileSync(
  "/tmp/app-factory-g3-harmony/entry/src/main/ets/pages/Index.ets",
  "utf8"
);
assert(ets.includes("preferences") && ets.includes("persistTodos"), "harmony 无 preferences");
console.log("✓ 鸿蒙 Preferences");

console.log("\n✅ verify:g3:persistence 通过");
