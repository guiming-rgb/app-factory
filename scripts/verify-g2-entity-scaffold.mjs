/**
 * G2 Spec→Screen 实体列表示例探针
 * npm run verify:g2:entity-scaffold
 */
import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";

const root = process.cwd();
const spec = "docs/schemas/examples/valid-wechat-full.json";

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

console.log("══ G2 实体列表示例 ══\n");

runCodegen("scripts/codegen-wechat.ts", "/tmp/app-factory-g2-wechat");
const wechatWxml = fs.readFileSync(
  "/tmp/app-factory-g2-wechat/pages/index/index.wxml",
  "utf8"
);
const wechatJs = fs.readFileSync(
  "/tmp/app-factory-g2-wechat/pages/index/index.js",
  "utf8"
);
assert(!wechatWxml.includes("列表占位"), "wechat 仍为列表占位");
assert(wechatWxml.includes("wx:for"), "wechat 缺少列表 ForEach");
assert(wechatJs.includes("items:"), "wechat 缺少 items 数据");
assert(wechatJs.includes("loadItems"), "wechat 缺少 Supabase loadItems");
assert(wechatJs.includes("onTapItem"), "wechat 缺少详情导航 onTapItem");
assert(
  fs.existsSync("/tmp/app-factory-g2-wechat/pages/entity-detail/entity-detail.js"),
  "wechat 缺少 entity-detail 页"
);
console.log("✓ 小程序实体列表 + 详情导航");

runCodegen("scripts/codegen-flutter.ts", "/tmp/app-factory-g2-flutter");
const flutterList = fs.readFileSync(
  "/tmp/app-factory-g2-flutter/lib/features/match_list/presentation/list_page.dart",
  "utf8"
);
assert(flutterList.includes("ListView"), "flutter match_list 无 ListView");
assert(!flutterList.includes("列表页占位"), "flutter 仍为列表占位");
assert(flutterList.includes("supabaseOrNull"), "flutter 缺少 Supabase 拉取");
assert(flutterList.includes("onTap"), "flutter 缺少详情 onTap");
console.log("✓ Flutter match_list 实体列表 + Supabase");

runCodegen("scripts/codegen-harmony.ts", "/tmp/app-factory-g2-harmony");
const harmonyIndex = fs.readFileSync(
  "/tmp/app-factory-g2-harmony/entry/src/main/ets/pages/Index.ets",
  "utf8"
);
assert(harmonyIndex.includes("ForEach"), "harmony Index 无 ForEach 列表");
assert(!harmonyIndex.includes("justifyContent(FlexAlign.Center)"), "harmony 仍为居中占位");
assert(harmonyIndex.includes("loadItems"), "harmony 缺少 loadItems");
assert(
  harmonyIndex.includes("@ohos.net.http") || harmonyIndex.includes("http.createHttp"),
  "harmony 缺少 Supabase HTTP"
);
assert(harmonyIndex.includes("/rest/v1/"), "harmony 缺少 PostgREST 路径");
assert(
  !harmonyIndex.includes("待接 Supabase"),
  "harmony fallback 仍含过时文案"
);
assert(
  harmonyIndex.includes("router.pushUrl") &&
    harmonyIndex.includes("pages/EntityDetail"),
  "harmony 列表缺少详情导航"
);
const harmonyDetail = fs.readFileSync(
  "/tmp/app-factory-g2-harmony/entry/src/main/ets/pages/EntityDetail.ets",
  "utf8"
);
const harmonyPages = JSON.parse(
  fs.readFileSync(
    "/tmp/app-factory-g2-harmony/entry/src/main/resources/base/profile/main_pages.json",
    "utf8"
  )
);
assert(
  harmonyPages.src.includes("pages/EntityDetail"),
  "harmony main_pages 无 EntityDetail"
);
assert(harmonyDetail.includes("router.getParams"), "harmony 详情无 getParams");
assert(harmonyDetail.includes("/rest/v1/"), "harmony 详情无 PostgREST");
console.log("✓ 鸿蒙 Index 列表 + EntityDetail + Supabase REST");

console.log("\n✅ verify:g2:entity-scaffold 通过\n");
