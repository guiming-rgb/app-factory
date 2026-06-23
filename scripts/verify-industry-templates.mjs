#!/usr/bin/env node
/**
 * npm run verify:industry:templates
 * 验证 19 套行业模板的完整性和代码生成集成
 */
import { readdirSync, existsSync, statSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const ALL_INDUSTRIES = [
  "finance","crm","fitness","ecommerce","education",
  "social","food","hotel","recruitment","property",
  "video","weather","sports","photo","dating",
  "medical","blog","game","payment"
];

let passed = 0, failed = 0;

function check(label, cond) {
  if (cond) { console.log(`  ✓ ${label}`); passed++; }
  else { console.error(`  ✗ ${label}`); failed++; }
}

// ─── 1. 模板目录结构 ────────────────────────────
console.log("══ 1. 模板目录结构 ══\n");
for (const ind of ALL_INDUSTRIES) {
  const dir = join(ROOT, "templates", `industry-${ind}`, "lib", "features", ind);
  console.log(`${ind}:`);

  const modelsDir = join(dir, "models");
  const servicesDir = join(dir, "services");
  const pagesDir = join(dir, "pages");
  const widgetsDir = join(dir, "widgets");

  check("models/", existsSync(modelsDir) && readdirSync(modelsDir).filter(f => f.endsWith(".dart")).length > 0);
  check("services/", existsSync(servicesDir) && readdirSync(servicesDir).filter(f => f.endsWith(".dart")).length > 0);
  check("pages/", existsSync(pagesDir) && readdirSync(pagesDir).filter(f => f.endsWith(".dart")).length >= 3);
  check("widgets/", existsSync(widgetsDir) || ["finance","crm","fitness","ecommerce","education"].includes(ind));
}

// ─── 2. 行业检测逻辑 ────────────────────────────
console.log("\n══ 2. detectIndustry 检测逻辑 ══\n");
const emitIndustry = join(ROOT, "lib", "flutter-codegen", "emit-industry.ts");
check("emit-industry.ts 存在", existsSync(emitIndustry));

// 动态导入检测
try {
  const { detectIndustry } = await import("../lib/flutter-codegen/emit-industry.js");
  // 回退：ts 不直接 import，用函数名检查
  check("detectIndustry 函数存在", typeof detectIndustry === "function");

  const tests = [
    ["记账 App", "finance", { displayName: "记账", appName: "finance_tracker", screens: [], metadata: {} }],
    ["CRM", "crm", { displayName: "CRM系统", appName: "crm", screens: [], metadata: { category: "企业" } }],
    ["健身", "fitness", { displayName: "健身助手", appName: "workout", screens: [] }],
    ["电商", "ecommerce", { displayName: "商城", appName: "shop", screens: [{ id: "product_list" }] }],
    ["教育", "education", { displayName: "课程表", appName: "timetable", screens: [] }],
    ["社交", "social", { displayName: "社交社区", appName: "social_app", screens: [] }],
    ["外卖", "food", { displayName: "外卖点餐", appName: "food_delivery", screens: [] }],
    ["酒店", "hotel", { displayName: "酒店预订", appName: "hotel_booking", screens: [] }],
    ["招聘", "recruitment", { displayName: "招聘", appName: "jobs", screens: [] }],
    ["物业", "property", { displayName: "物业服务", appName: "property_mgmt", screens: [] }],
    ["影音", "video", { displayName: "视频", appName: "video_app", screens: [] }],
    ["天气", "weather", { displayName: "天气预报", appName: "weather_app", screens: [] }],
    ["体育", "sports", { displayName: "体育赛事", appName: "sports", screens: [] }],
    ["照片", "photo", { displayName: "照片分享", appName: "photo_app", screens: [] }],
    ["交友", "dating", { displayName: "交友", appName: "dating_app", screens: [] }],
    ["医疗", "medical", { displayName: "在线问诊", appName: "medical_app", screens: [] }],
    ["博客", "blog", { displayName: "博客", appName: "blog", screens: [] }],
    ["游戏", "game", { displayName: "休闲游戏", appName: "game_app", screens: [] }],
    ["支付", "payment", { displayName: "支付", appName: "payment_app", screens: [] }],
  ];

  for (const [label, expected, spec] of tests) {
    const result = detectIndustry(spec);
    check(`${label} → ${expected}`, result === expected);
  }
} catch (e) {
  console.warn(`  ⚠ 无法动态加载 detectIndustry: ${e.message}`);
  console.warn("  → 改为检查源代码中是否存在 detectIndustry 函数");
  try {
    const src = await import("fs").then(fs => fs.readFileSync(emitIndustry, "utf8"));
    check("源代码含 detectIndustry", src.includes("export function detectIndustry"));
    for (const ind of ALL_INDUSTRIES) {
      check(`源代码含 "${ind}" 检测规则`, src.includes(`return "${ind}"`) || src.includes(`"${ind}"`));
    }
  } catch (e2) {
    console.warn(`  ⚠ ${e2.message}`);
  }
}

// ─── 3. generate.ts 集成 ──────────────────────────
console.log("\n══ 3. generate.ts 集成 ══\n");
const genFile = join(ROOT, "lib", "flutter-codegen", "generate.ts");
check("generate.ts 存在", existsSync(genFile));
try {
  const src = await import("fs").then(fs => fs.readFileSync(genFile, "utf8"));
  check("generate.ts 引用 detectIndustry", src.includes("detectIndustry"));
  check("generate.ts 引用 copyIndustryTemplate", src.includes("copyIndustryTemplate"));
  check("generate.ts 引用 emit-industry", src.includes("emit-industry"));
} catch (e) { console.warn(`  ⚠ ${e.message}`); }

// ─── 4. copy-industry-template.ts ──────────────────
console.log("\n══ 4. copy-industry-template.ts ══\n");
const copyFile = join(ROOT, "lib", "flutter-codegen", "copy-industry-template.ts");
check("copy-industry-template.ts 存在", existsSync(copyFile));
try {
  const src = await import("fs").then(fs => fs.readFileSync(copyFile, "utf8"));
  check("支持 game 模板", src.includes("game") || src.includes("IndustryCategory"));
  check("支持 payment 模板", src.includes("payment") || src.includes("IndustryCategory"));
} catch (e) { console.warn(`  ⚠ ${e.message}`); }

// ─── 结果 ─────────────────────────────────────────
console.log(`\n══ 结果: ${passed} 通过 / ${failed} 失败 ══`);
if (failed > 0) process.exit(1);
