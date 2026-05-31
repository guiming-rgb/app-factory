/**
 * H4 枪战样本 Spec → 三栈 codegen 探针（本地，不依赖 8/8 Agent）
 * npm run verify:h4:shooter
 */
import fs from "fs";
import { spawnSync } from "child_process";

const root = process.cwd();
const spec = "docs/schemas/examples/valid-shooter-minimal.json";

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

console.log("══ H4 少年枪战 Spec codegen ══\n");

runCodegen("scripts/codegen-wechat.ts", "/tmp/app-factory-h4-wechat");
const wx = fs.readFileSync(
  "/tmp/app-factory-h4-wechat/pages/index/index.wxml",
  "utf8"
);
assert(!wx.includes("列表占位"), "wechat 仍为占位");
assert(wx.includes("wx:for"), "wechat 无列表");
console.log("✓ 小程序 对战列表");

runCodegen("scripts/codegen-flutter.ts", "/tmp/app-factory-h4-flutter");
const dart = fs.readFileSync(
  "/tmp/app-factory-h4-flutter/lib/features/match_list/presentation/list_page.dart",
  "utf8"
);
assert(dart.includes("ListView"), "flutter 无 ListView");
console.log("✓ Flutter match_list");

runCodegen("scripts/codegen-harmony.ts", "/tmp/app-factory-h4-harmony");
const ets = fs.readFileSync(
  "/tmp/app-factory-h4-harmony/entry/src/main/ets/pages/Index.ets",
  "utf8"
);
assert(ets.includes("ForEach"), "harmony 无列表");
assert(ets.includes("pages/EntityDetail"), "harmony 无详情路由");
assert(
  fs.existsSync("/tmp/app-factory-h4-harmony/entry/src/main/ets/pages/EntityDetail.ets"),
  "harmony 无 EntityDetail.ets"
);
console.log("✓ 鸿蒙 Index 列表 + 详情页");

console.log("\n✅ verify:h4:shooter 通过（生产 8/8 请维护者在项目 0ea7a53c… 点生成）");
