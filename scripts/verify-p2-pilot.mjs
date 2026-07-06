#!/usr/bin/env node
/**
 * P2 试点门禁 — finance / ecommerce / medical 三栈
 * npm run verify:p2:pilot
 */
import { existsSync, readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { rm } from "fs/promises";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
let passed = 0, failed = 0;

function ok(label) { console.log(`  ✓ ${label}`); passed++; }
function fail(label, detail = "") { console.error(`  ✗ ${label}${detail ? " — " + detail : ""}`); failed++; }

const PILOTS = [
  {
    ind: "finance",
    displayName: "记账本",
    screens: [
      { id: "dashboard_view", title: "总览", type: "dashboard" },
      { id: "transaction_list", title: "账单", type: "list", entity: "transactions" },
    ],
    flutterWidget: "TransactionTile",
    service: "financeService",
  },
  {
    ind: "ecommerce",
    displayName: "商城",
    screens: [
      { id: "home", title: "首页", type: "card_grid" },
      { id: "product_list", title: "商品", type: "list", entity: "products" },
    ],
    flutterWidget: "ProductCardEnhanced",
    service: "ecommerceService",
  },
  {
    ind: "medical",
    displayName: "在线问诊",
    screens: [
      { id: "home", title: "首页", type: "card_grid" },
      { id: "doctor_list", title: "医生", type: "list", entity: "doctors" },
    ],
    flutterWidget: "DoctorCard",
    service: "medicalService",
  },
];

function buildSpec(pilot) {
  return {
    specVersion: "0.1.0",
    appName: `p2_${pilot.ind}`,
    displayName: pilot.displayName,
    targets: {
      flutter: { enabled: true, platforms: ["ios", "android"], formFactors: ["phone"] },
      backend: { provider: "supabase" },
      wechatMiniProgram: { enabled: true },
      harmony: { enabled: true },
    },
    screens: [
      { id: "home", title: "首页", type: "tabRoot" },
      ...pilot.screens.filter((s) => s.id !== "home"),
      { id: "profile", title: "我的", type: "placeholder" },
    ],
    navigation: { tabs: [pilot.screens.find((s) => s.type === "list")?.id || "home", "profile"] },
    metadata: { category: pilot.ind },
    limitations: ["P2 试点模板限制"],
    entities: pilot.screens
      .filter((s) => s.entity)
      .map((s) => ({ name: s.entity, fields: [{ name: "title", type: "string" }] })),
  };
}

async function main() {
  console.log("══ P2 试点门禁 — finance / ecommerce / medical ══\n");

  // 1. JSON 配置
  for (const p of PILOTS) {
    const cfgPath = join(ROOT, "config", "industries", `${p.ind}.json`);
    if (!existsSync(cfgPath)) { fail(`config ${p.ind}.json`); continue; }
    const cfg = JSON.parse(readFileSync(cfgPath, "utf8"));
    if (cfg.pilot !== true) fail(`${p.ind} pilot flag`);
    else ok(`config ${p.ind}.json pilot=true`);
    if (cfg.serviceName !== p.service) fail(`${p.ind} serviceName`, cfg.serviceName);
    else ok(`${p.ind} serviceName=${p.service}`);
  }

  // 2. Mustache 模板存在
  for (const p of PILOTS) {
    const flutterTpl = join(ROOT, "templates", "flutter-minimal", "lib", "core", "widgets", "industry", `${p.ind}_widgets.dart.mustache`);
    const wechatWxml = join(ROOT, "templates", "wechat-miniprogram-minimal", "pages", "industry", `${p.ind}.wxml.mustache`);
    const harmonyEts = join(ROOT, "templates", "harmony-minimal", "entry", "src", "main", "ets", "pages", "industry", `${p.ind}.ets.mustache`);
    for (const [label, fp] of [["flutter", flutterTpl], ["wechat-wxml", wechatWxml], ["harmony", harmonyEts]]) {
      existsSync(fp) ? ok(`${p.ind} ${label} mustache`) : fail(`${p.ind} ${label} mustache`, fp);
    }
  }

  // 3. 三栈生成
  const { generateFlutterProject } = await import("../lib/flutter-codegen/generate.ts");
  const { generateWechatProject } = await import("../lib/wechat-codegen/generate.ts");
  const { generateHarmonyProject } = await import("../lib/harmony-codegen/generate.ts");

  for (const pilot of PILOTS) {
    const spec = buildSpec(pilot);
    console.log(`\n── ${pilot.ind} 三栈生成 ──`);

    try {
      const flutter = await generateFlutterProject(spec);
      const widgetPath = join(flutter.outputDir, "lib", "features", pilot.ind, "widgets", `${pilot.ind}_widgets.dart`);
      const industryWidgets = join(flutter.outputDir, "lib", "core", "widgets", "industry_widgets.dart");
      const widgetFile = existsSync(widgetPath) ? widgetPath : industryWidgets;
      if (!existsSync(widgetFile)) fail(`${pilot.ind} Flutter widget 文件`);
      else {
        const content = readFileSync(widgetFile, "utf8");
        content.includes(pilot.flutterWidget) ? ok(`${pilot.ind} Flutter ${pilot.flutterWidget}`) : fail(`${pilot.ind} Flutter widget class`);
      }
      await rm(flutter.outputDir, { recursive: true, force: true }).catch(() => {});
    } catch (e) {
      fail(`${pilot.ind} Flutter 生成`, e.message);
    }

    try {
      const wechat = await generateWechatProject(spec);
      const industryJs = join(wechat.outputDir, "services", "industry.js");
      if (!existsSync(industryJs)) fail(`${pilot.ind} 微信 industry.js`);
      else {
        readFileSync(industryJs, "utf8").includes(pilot.service) ? ok(`${pilot.ind} 微信 ${pilot.service}`) : fail(`${pilot.ind} 微信 service`);
      }
      await rm(wechat.outputDir, { recursive: true, force: true }).catch(() => {});
    } catch (e) {
      fail(`${pilot.ind} 微信 生成`, e.message);
    }

    try {
      const harmony = await generateHarmonyProject(spec);
      const svc = join(harmony.outputDir, "entry", "src", "main", "ets", "services", "IndustryServices.ets");
      if (!existsSync(svc)) fail(`${pilot.ind} 鸿蒙 IndustryServices.ets`);
      else ok(`${pilot.ind} 鸿蒙 IndustryServices.ets`);
      await rm(harmony.outputDir, { recursive: true, force: true }).catch(() => {});
    } catch (e) {
      fail(`${pilot.ind} 鸿蒙 生成`, e.message);
    }
  }

  console.log(`\n══ 结果: ${passed} 通过 / ${failed} 失败 ══`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
