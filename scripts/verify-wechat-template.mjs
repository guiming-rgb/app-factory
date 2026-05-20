/**
 * v2b-实现-1：微信小程序最小模板结构验收
 * 用法：npm run verify:wechat
 */
import fs from "fs";
import path from "path";

const root = process.cwd();
const argPath = process.argv[2];
const tpl = argPath
  ? path.isAbsolute(argPath)
    ? argPath
    : path.join(root, argPath)
  : path.join(root, "templates/wechat-miniprogram-minimal");

const REQUIRED = [
  "app.json",
  "app.js",
  "app.wxss",
  "project.config.json",
  "sitemap.json",
  "pages/index/index.js",
  "pages/index/index.json",
  "pages/index/index.wxml",
  "pages/index/index.wxss",
  "pages/profile/profile.js",
  "pages/profile/profile.json",
  "pages/profile/profile.wxml",
  "pages/profile/profile.wxss",
  "utils/config.js",
  "utils/supabase.js",
  "utils/auth.js",
  "components/privacy-popup/privacy-popup.js",
  "subpkg/placeholder/index.js",
  "tool/codegen_manifest.json",
  "README.md"
];

function fail(msg) {
  console.error(`❌ ${msg}`);
  process.exit(1);
}

function main() {
  console.log("══ 微信小程序模板验收（verify:wechat）══\n");
  console.log(`目录: ${tpl}\n`);

  for (const rel of REQUIRED) {
    const full = path.join(tpl, rel);
    if (!fs.existsSync(full)) {
      fail(`缺少文件：${rel}`);
    }
  }
  console.log(`✓ 必需文件 ${REQUIRED.length}/${REQUIRED.length}`);

  const appJson = JSON.parse(fs.readFileSync(path.join(tpl, "app.json"), "utf8"));
  const pages = appJson.pages || [];
  if (pages.length < 2) fail("app.json pages 少于 2");
  for (const p of pages) {
    const base = path.join(tpl, p);
    for (const ext of [".wxml", ".js", ".json"]) {
      if (!fs.existsSync(`${base}${ext}`)) {
        fail(`页面不完整：${p}${ext}`);
      }
    }
  }
  console.log(`✓ app.json 注册 ${pages.length} 个主包页面`);

  const tabBar = appJson.tabBar?.list || [];
  if (tabBar.length < 2) fail("tabBar 少于 2 项");
  for (const tab of tabBar) {
    if (!pages.includes(tab.pagePath)) {
      fail(`tabBar 指向未注册页面：${tab.pagePath}`);
    }
    for (const key of ["iconPath", "selectedIconPath"]) {
      const icon = path.join(tpl, tab[key]);
      if (!fs.existsSync(icon)) fail(`Tab 图标缺失：${tab[key]}`);
    }
  }
  console.log(`✓ tabBar ${tabBar.length} 项与图标`);

  const subs = appJson.subPackages || [];
  if (subs.length === 0) fail("缺少 subPackages 空壳");
  console.log(`✓ subPackages ${subs.length} 项`);

  const proj = JSON.parse(
    fs.readFileSync(path.join(tpl, "project.config.json"), "utf8")
  );
  if (proj.compileType !== "miniprogram") fail("project.config.json compileType 非 miniprogram");
  console.log(`✓ project.config.json（libVersion ${proj.libVersion || "—"}）`);

  console.log("\n✅ verify:wechat 通过");
  console.log("   下一步：微信开发者工具导入本目录，确认模拟器可打开首页 Tab。");
}

main();
