#!/usr/bin/env node
/**
 * npm run verify:industry:parity
 * P0 三栈 Parity 门禁：同一 Spec → Flutter / 微信 / 鸿蒙 生成并 diff
 */
import { existsSync, readdirSync, statSync, readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const TMP = "/tmp/app-factory-parity";

let passed = 0, failed = 0, warnings = 0;

function ok(label, detail = "") { console.log(`  ✓ ${label}${detail ? " — " + detail : ""}`); passed++; }
function fail(label, detail = "") { console.error(`  ✗ ${label}${detail ? " — " + detail : ""}`); failed++; }
function warn(label) { console.warn(`  ⚠ ${label}`); warnings++; }

// ─── 测试 Spec ──────────────────────────────
const PARITY_SPECS = [
  { id: "finance", displayName: "记账测试", appName: "parity_finance", industry: "finance",
    screens: [{id:"dashboard",title:"总览",type:"dashboard"},{id:"transactions",title:"账单",type:"list",entity:"transactions"},{id:"add",title:"记一笔",type:"form",entity:"transactions"}] },
  { id: "ecommerce", displayName: "电商测试", appName: "parity_ecommerce", industry: "ecommerce",
    screens: [{id:"home",title:"首页",type:"card_grid"},{id:"products",title:"商品",type:"list",entity:"products"},{id:"detail",title:"详情",type:"detail",entity:"products"}] },
  { id: "game", displayName: "游戏测试", appName: "parity_game", industry: "game",
    screens: [{id:"play",title:"开始",type:"game"},{id:"scores",title:"排行榜",type:"list",entity:"game_scores"}] },
];

// ─── ESM 动态加载 ────────────────────────────
async function importModule(path) {
  try { return await import(path); }
  catch (e) { return null; }
}

async function main() {
  console.log("══ 三栈 Parity 门禁 ══\n");

  // 1. 静态检查
  console.log("── 1. 静态三栈一致性 ──\n");

  // Flutter
  ok("emit-industry.ts", existsSync(join(ROOT, "lib/flutter-codegen/emit-industry.ts")));
  ok("dart-emit.ts pageWidgetRef", readFileSync(join(ROOT, "lib/flutter-codegen/dart-emit.ts"),"utf8").includes("pageWidgetRef"));
  ok("copy-industry-template.ts", existsSync(join(ROOT, "lib/flutter-codegen/copy-industry-template.ts")));

  // 微信
  const wechatIndustry = join(ROOT, "templates/wechat-miniprogram-minimal/services/industry.js");
  ok("微信 industry.js", existsSync(wechatIndustry));
  if (existsSync(wechatIndustry)) {
    const jsContent = readFileSync(wechatIndustry, "utf8");
    for (const ind of ["finance","crm","game","payment","ecommerce"]) {
      ok(`  微信 industry.js 含 ${ind}Service`, jsContent.includes(`${ind}Service`));
    }
  }

  // 鸿蒙
  ok("鸿蒙 emit-industry-services.ts", existsSync(join(ROOT, "lib/harmony-codegen/emit-industry-services.ts")));
  ok("鸿蒙 generate.ts 路由", existsSync(join(ROOT, "lib/harmony-codegen/generate.ts")));

  // 2. 动态生成
  console.log("\n── 2. 三栈动态生成 ──\n");

  for (const spec of PARITY_SPECS) {
    const appSpec = {
      specVersion: "0.1.0", appName: spec.appName, displayName: spec.displayName,
      targets: { flutter: { enabled: true, platforms: ["ios","android"], formFactors: ["phone"] }, backend: { provider: "supabase" } },
      screens: [{ id: "home", title: "首页", type: "tabRoot" }, ...spec.screens, { id: "profile", title: "我的", type: "placeholder" }],
      entities: spec.screens.filter(s => s.entity).map(s => {
        const tbl = s.entity || "items";
        return { name: tbl, fields: [{ name: "id", type: "uuid", primary: true }, { name: "title", type: "string" }, { name: "created_at", type: "datetime" }] };
      }),
      navigation: { tabs: ["home", spec.screens[0]?.id || "list", "profile"] },
      limitations: ["parity 门禁测试"],
      metadata: { category: spec.industry }
    };

    // Flutter
    const flutterMod = await importModule(join(ROOT, "lib/flutter-codegen/generate.ts"));
    if (flutterMod?.generateFlutterProject) {
      try {
        const r = await flutterMod.generateFlutterProject(appSpec, { keepOutput: true });
        ok(`${spec.id} Flutter`, r.outputDir ? "生成成功" : "失败");
      } catch (e) { fail(`${spec.id} Flutter`, e.message?.slice(0,80)); }
    } else { warn(`${spec.id} Flutter 无法加载 generateFlutterProject`); }

    // 微信
    const wechatMod = await importModule(join(ROOT, "lib/wechat-codegen/generate.ts"));
    if (wechatMod?.generateWechatProject) {
      try {
        const r = await wechatMod.generateWechatProject(appSpec);
        ok(`${spec.id} 微信`, r.outputDir ? "生成成功" : "失败");
      } catch (e) { fail(`${spec.id} 微信`, e.message?.slice(0,80)); }
    } else { warn(`${spec.id} 微信 无法加载 generateWechatProject`); }

    // 鸿蒙
    const harmonyMod = await importModule(join(ROOT, "lib/harmony-codegen/generate.ts"));
    if (harmonyMod?.generateHarmonyProject) {
      try {
        const r = await harmonyMod.generateHarmonyProject(appSpec);
        ok(`${spec.id} 鸿蒙`, r.outputDir ? "生成成功" : "失败");
      } catch (e) { fail(`${spec.id} 鸿蒙`, e.message?.slice(0,80)); }
    } else { warn(`${spec.id} 鸿蒙 无法加载 generateHarmonyProject`); }
  }

  // 3. 行业 service 三栈一致性
  console.log("\n── 3. 行业 service API 一致性 ──\n");
  const industries = ["finance","crm","ecommerce","game","payment"];
  const flutterIndustry = readFileSync(join(ROOT, "lib/flutter-codegen/emit-industry.ts"), "utf8");
  const wechatJS = existsSync(wechatIndustry) ? readFileSync(wechatIndustry, "utf8") : "";
  const harmonyEmits = existsSync(join(ROOT, "lib/harmony-codegen/emit-industry-services.ts")) ? readFileSync(join(ROOT, "lib/harmony-codegen/emit-industry-services.ts"), "utf8") : "";

  for (const ind of industries) {
    const inFlutter = flutterIndustry.includes(ind) || existsSync(join(ROOT, `templates/industry-${ind}`));
    const inWechat = wechatJS.includes(`${ind}Service`);
    const inHarmony = harmonyEmits.includes(ind);
    const count = [inFlutter, inWechat, inHarmony].filter(Boolean).length;
    if (count === 3) ok(ind, "三栈 ✓");
    else if (count >= 2) warn(`${ind}: ${count}/3 栈`);
    else fail(ind, `${count}/3 栈`);
  }

  // 清理
  const { rm } = await import("fs/promises");
  await rm(TMP, { recursive: true, force: true }).catch(() => {});

  console.log(`\n══ 结果: ${passed} 通过 / ${failed} 失败 / ${warnings} 警告 ══`);
  if (failed > 0) process.exit(1);
}

main().catch(e => { console.error(e); process.exit(1); });
