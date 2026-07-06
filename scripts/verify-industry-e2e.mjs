#!/usr/bin/env node
/**
 * npm run verify:industry:e2e
 * 19 行业 × 三栈端到端：Spec → 生成 → 结构验证
 */
import { existsSync, readFileSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { rm } from "fs/promises";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

function parseIndustryFilter() {
  const arg = process.argv.find((a) => a.startsWith("--filter="));
  if (!arg) return null;
  return arg.slice(9).split(",").map((s) => s.trim()).filter(Boolean);
}


const ALL_INDUSTRIES = [
  { ind: "finance", name: "记账", displayName: "我的记账本", screens: [{id:"dashboard_view",title:"总览",type:"dashboard"},{id:"transaction_list",title:"账单",type:"list",entity:"transactions"},{id:"add_transaction",title:"记一笔",type:"form",entity:"transactions"}] },
  { ind: "crm", name: "CRM", displayName: "客户管理", screens: [{id:"dashboard",title:"统计",type:"dashboard"},{id:"client_list",title:"客户",type:"list",entity:"contacts"},{id:"kanban",title:"看板",type:"kanban"}] },
  { ind: "fitness", name: "健身", displayName: "健身助手", screens: [{id:"today",title:"今日",type:"dashboard"},{id:"course_list",title:"课程",type:"list",entity:"workouts"},{id:"calendar",title:"日程",type:"calendar"}] },
  { ind: "ecommerce", name: "电商", displayName: "商城", screens: [{id:"home",title:"首页",type:"card_grid"},{id:"product_list",title:"商品",type:"list",entity:"products"},{id:"cart",title:"购物车",type:"list",entity:"cart_items"}] },
  { ind: "education", name: "教育", displayName: "课程表", screens: [{id:"timetable",title:"课表",type:"calendar"},{id:"course_list",title:"课程",type:"list",entity:"courses"},{id:"grades",title:"成绩",type:"list",entity:"grades"}] },
  { ind: "social", name: "社交", displayName: "社区", screens: [{id:"feed",title:"动态",type:"list",entity:"posts"},{id:"create_post",title:"发布",type:"form",entity:"posts"}] },
  { ind: "food", name: "外卖", displayName: "外卖", screens: [{id:"home",title:"首页",type:"card_grid"},{id:"restaurant_list",title:"商家",type:"list",entity:"restaurants"}] },
  { ind: "hotel", name: "酒店", displayName: "酒店预订", screens: [{id:"hotel_list",title:"酒店",type:"list",entity:"hotels"},{id:"booking",title:"预订",type:"form",entity:"bookings"}] },
  { ind: "recruitment", name: "招聘", displayName: "招聘", screens: [{id:"job_list",title:"职位",type:"list",entity:"jobs"},{id:"company_list",title:"公司",type:"list"}] },
  { ind: "property", name: "物业", displayName: "物业", screens: [{id:"home",title:"首页",type:"dashboard"},{id:"repair_list",title:"报修",type:"list",entity:"repairs"}] },
  { ind: "video", name: "影音", displayName: "视频", screens: [{id:"home",title:"首页",type:"card_grid"},{id:"video_list",title:"视频",type:"list",entity:"videos"}] },
  { ind: "weather", name: "天气", displayName: "天气", screens: [{id:"today",title:"今日",type:"dashboard"},{id:"city_list",title:"城市",type:"list",entity:"cities"}] },
  { ind: "sports", name: "体育", displayName: "体育赛事", screens: [{id:"live",title:"直播",type:"card_grid"},{id:"match_list",title:"赛程",type:"list",entity:"matches"}] },
  { ind: "photo", name: "照片", displayName: "照片分享", screens: [{id:"discover",title:"发现",type:"list",entity:"photos"},{id:"upload",title:"发布",type:"form",entity:"photos"}] },
  { ind: "dating", name: "交友", displayName: "交友", screens: [{id:"discover",title:"发现",type:"card_grid"},{id:"profile_detail",title:"详情",type:"detail"}] },
  { ind: "medical", name: "医疗", displayName: "在线问诊", screens: [{id:"home",title:"首页",type:"card_grid"},{id:"doctor_list",title:"医生",type:"list",entity:"doctors"}] },
  { ind: "blog", name: "博客", displayName: "博客", screens: [{id:"feed",title:"推荐",type:"list",entity:"articles"},{id:"category_list",title:"分类",type:"list"}] },
  { ind: "game", name: "游戏", displayName: "休闲游戏", screens: [{id:"play",title:"开始游戏",type:"game"},{id:"scores",title:"排行榜",type:"list",entity:"game_scores"}] },
  { ind: "payment", name: "支付", displayName: "收银台", screens: [{id:"checkout",title:"结算",type:"payment"},{id:"orders",title:"订单",type:"list",entity:"orders"}] },
];

let passed = 0, failed = 0;

function check(label, cond, detail = "") {
  if (cond) { console.log(`  ✓ ${label}${detail ? " — " + detail : ""}`); passed++; }
  else { console.error(`  ✗ ${label}${detail ? " — " + detail : ""}`); failed++; }
}

function buildSpec({ ind, displayName, screens }) {
  const tabHome = { id: "home", title: "首页", type: "tabRoot" };
  const profile = { id: "profile", title: "我的", type: "placeholder" };
  const middle = screens.filter((s) => s.id !== "home" && s.id !== "profile");
  const mergedScreens = [tabHome, ...middle, profile];
  const firstTab = middle[0]?.id || "list";

  return {
    specVersion: "0.1.0",
    appName: `test_${ind}`,
    displayName,
    targets: {
      flutter: { enabled: true, platforms: ["ios","android"], formFactors: ["phone"] },
      backend: { provider: "supabase" },
      harmony: { enabled: true, formFactors: ["phone"] },
      wechatMiniProgram: { enabled: true },
    },
    screens: mergedScreens,
    entities: middle.filter(s => s.entity).map(s => ({
      name: s.entity || "items",
      fields: [{ name: "id", type: "uuid", primary: true }, { name: "title", type: "string" }, { name: "created_at", type: "datetime" }],
    })),
    navigation: { tabs: ["home", firstTab, "profile"].slice(0, 3) },
    limitations: ["端到端验证"],
    metadata: { category: ind },
  };
}

function grepDir(dir, pattern) {
  if (!existsSync(dir)) return false;
  try {
    for (const ent of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, ent.name);
      if (ent.isFile()) {
        try { if (readFileSync(p, "utf8").includes(pattern)) return true; } catch { /* skip binary */ }
      } else if (ent.isDirectory() && grepDir(p, pattern)) return true;
    }
  } catch { /* skip */ }
  return false;
}

async function main() {
  console.log("══ 19 行业 × 三栈端到端验证 ══\n");

  let genFlutter, genWechat, genHarmony;
  try {
    genFlutter = (await import("../lib/flutter-codegen/generate.ts")).generateFlutterProject;
    genWechat = (await import("../lib/wechat-codegen/generate.ts")).generateWechatProject;
    genHarmony = (await import("../lib/harmony-codegen/generate.ts")).generateHarmonyProject;
    check("generateFlutterProject 加载", true);
    check("generateWechatProject 加载", true);
    check("generateHarmonyProject 加载", true);
  } catch (e) {
    console.error("❌ 生成器加载失败:", e.message);
    process.exit(1);
  }

  const filter = parseIndustryFilter();
  const industries = filter
    ? ALL_INDUSTRIES.filter((i) => filter.includes(i.ind))
    : ALL_INDUSTRIES;
  if (filter?.length && industries.length === 0) {
    console.error("❌ --filter 无匹配行业:", filter.join(", "));
    process.exit(1);
  }
  if (filter) console.log(`── 增量模式: ${industries.map((i) => i.ind).join(", ")} ──\n`);

  for (const industry of industries) {
    const { ind, name } = industry;
    const spec = buildSpec(industry);
    console.log(`\n── ${name} (${ind}) ──`);

    // Flutter
    try {
      const result = await genFlutter(spec, { keepOutput: true });
      check("Flutter 生成", !!result.outputDir, result.appName);
      const templateDir = join(ROOT, "templates", `industry-${ind}`, "lib", "features", ind);
      if (existsSync(templateDir)) {
        const modelFiles = readdirSync(join(templateDir, "models")).filter(f => f.endsWith(".dart"));
        const pageFiles = readdirSync(join(templateDir, "pages")).filter(f => f.endsWith(".dart"));
        check("Flutter models", modelFiles.length > 0, `${modelFiles.length} 文件`);
        check("Flutter pages", pageFiles.length >= 2, `${pageFiles.length} 文件`);
      }
      const routerFile = join(result.outputDir, "lib", "router", "app_router.dart");
      if (existsSync(routerFile)) {
        const router = readFileSync(routerFile, "utf8");
        check("Flutter router", router.includes("import"));
      }
      await rm(result.outputDir.split("/").slice(0, -1).join("/"), { recursive: true, force: true }).catch(() => {});
    } catch (e) {
      check("Flutter 生成", false, e.message?.slice(0, 80));
    }

    // 微信
    try {
      const wResult = await genWechat(spec);
      check("微信 生成", !!wResult.outputDir, wResult.appName);
      const detailJs = join(wResult.outputDir, "pages", "entity-detail", "entity-detail.js");
      if (existsSync(detailJs)) {
        const js = readFileSync(detailJs, "utf8");
        check("微信 detail 含 .get(", js.includes(".get("));
        check("微信 detail 含 industry service", js.includes("Service") && js.includes("services/industry"));
      }
      const formScreen = spec.screens.find(s => s.type === "form");
      if (formScreen) {
        const safe = formScreen.id.replace(/[^a-z0-9_]/gi, "_").toLowerCase();
        const formJs = join(wResult.outputDir, "pages", safe, `${safe}.js`);
        if (existsSync(formJs)) {
          const js = readFileSync(formJs, "utf8");
          check("微信 form 含 .create(", js.includes(".create("));
        }
      }
      if (ind === "game") {
        const gameJs = readFileSync(join(wResult.outputDir, "pages", "play", "play.js"), "utf8");
        check("微信 gameService", gameJs.includes("gameService"));
      }
      if (ind === "payment") {
        const payJs = readFileSync(join(wResult.outputDir, "pages", "checkout", "checkout.js"), "utf8");
        check("微信 paymentService", payJs.includes("paymentService"));
      }
      await rm(wResult.outputDir.split("/").slice(0, -1).join("/"), { recursive: true, force: true }).catch(() => {});
    } catch (e) {
      check("微信 生成", false, e.message?.slice(0, 80));
    }

    // 鸿蒙
    try {
      const hResult = await genHarmony(spec);
      check("鸿蒙 生成", !!(hResult.outputDir || hResult.bundleName));
      const svcPath = join(hResult.outputDir, "entry/src/main/ets/services/IndustryServices.ets");
      if (existsSync(svcPath)) {
        const svc = readFileSync(svcPath, "utf8");
        check("鸿蒙 IndustryServices", svc.includes(`${ind}Service`));
      }
      if (ind === "game" || ind === "payment") {
        const pagesDir = join(hResult.outputDir, "entry/src/main/ets/pages");
        check("鸿蒙 页面引用 IndustryServices", grepDir(pagesDir, "IndustryServices"));
      }
      await rm(hResult.outputDir.split("/").slice(0, -1).join("/"), { recursive: true, force: true }).catch(() => {});
    } catch (e) {
      check("鸿蒙 生成", false, e.message?.slice(0, 80));
    }
  }

  console.log(`\n══ 结果: ${passed} 通过 / ${failed} 失败 ══`);
  if (failed > 0) process.exit(1);
}

main().catch(e => { console.error(e); process.exit(1); });
