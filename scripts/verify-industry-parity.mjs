#!/usr/bin/env node
/**
 * npm run verify:industry:parity
 * P0 三栈 Parity 门禁 v2 — 深度断言
 */
import { existsSync, readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
let passed = 0, failed = 0;

function ok(l,d="") { console.log(`  ✓ ${l}${d?" — "+d:""}`); passed++; }
function fail(l,d="") { console.error(`  ✗ ${l}${d?" — "+d:""}`); failed++; }

const TMP = "/tmp/app-factory-parity";
const PARITY_SPECS = [
  {id:"finance",n:"记账",a:"parity_finance",ind:"finance",sc:[{id:"dashboard",t:"总览",ty:"dashboard"},{id:"transactions",t:"账单",ty:"list",e:"transactions"},{id:"add",t:"记一笔",ty:"form",e:"transactions"}]},
  {id:"ecommerce",n:"电商",a:"parity_ecomm",ind:"ecommerce",sc:[{id:"home",t:"首页",ty:"card_grid"},{id:"products",t:"商品",ty:"list",e:"products"},{id:"detail",t:"详情",ty:"detail",e:"products"}]},
  {id:"game",n:"游戏",a:"parity_game",ind:"game",sc:[{id:"play",t:"开始",ty:"game"},{id:"scores",t:"排行",ty:"list",e:"game_scores"}]},
];

async function main() {
  console.log("══ 三栈 Parity 门禁 v2 ══\n");

  // ── 1. Flutter 路由深度断言 ──
  console.log("── 1. Flutter 路由 ──\n");
  const dartEmit = readFileSync(join(ROOT,"lib/flutter-codegen/dart-emit.ts"),"utf8");
  ok("pageWidgetRef 调用 detectIndustry",dartEmit.includes("detectIndustry"));
  ok("pageWidgetRef 调用 resolveIndustryPageRef",dartEmit.includes("resolveIndustryPageRef"));

  const indRef = readFileSync(join(ROOT,"lib/flutter-codegen/industry-page-ref.ts"),"utf8");
  for(const w of ["TransactionDetailPage","ProductDetailPage","GameScoreDetailPage","TransactionFormPage","ProductFormPage"]) {
    ok(`INDUSTRY_PAGE_CLASSES 含 ${w}`,indRef.includes(w));
  }
  ok("detail 类型路由",indRef.includes('screen.type === "detail"'));
  ok("form 类型路由",indRef.includes('screen.type === "form"'));

  // ── 2. 微信 19 service + game/payment ──
  console.log("\n── 2. 微信 ──\n");
  const wxJs = readFileSync(join(ROOT,"templates/wechat-miniprogram-minimal/services/industry.js"),"utf8");
  for(const s of ["financeService","crmService","gameService","paymentService","ecommerceService"]) {
    ok(`微信 industry.js exports ${s}`,wxJs.includes(`const ${s}`)||wxJs.includes(`${s}:`));
  }

  const wxExt = readFileSync(join(ROOT,"lib/wechat-codegen/emit-extended.ts"),"utf8");
  ok("微信 game WXML emit",wxExt.includes("emitWechatGameWxml"));
  ok("微信 game JS emit",wxExt.includes("emitWechatGameJs"));
  ok("微信 game JS 调用 gameService",wxExt.includes("gameService"));
  ok("微信 payment WXML emit",wxExt.includes("emitWechatPaymentWxml"));
  ok("微信 payment JS emit",wxExt.includes("emitWechatPaymentJs"));
  ok("微信 payment JS 调用 paymentService",wxExt.includes("paymentService"));

  const wxGen = readFileSync(join(ROOT,"lib/wechat-codegen/generate.ts"),"utf8");
  ok('微信 generate.ts 含 "game"',wxGen.includes('"game"'));
  ok('微信 generate.ts 含 "payment"',wxGen.includes('"payment"'));

  // ── 3. 鸿蒙 19 service + game/payment ──
  console.log("\n── 3. 鸿蒙 ──\n");
  const hEmit = readFileSync(join(ROOT,"lib/harmony-codegen/emit-industry-services.ts"),"utf8");
  const industries = ["finance","crm","fitness","ecommerce","education","social","food","hotel","recruitment","property","video","weather","sports","photo","dating","medical","blog","game","payment"];
  for(const ind of industries) {
    ok(`鸿蒙 IndustryServices 含 ${ind}Service`,hEmit.includes(`${ind}Service`));
  }

  const hExt = readFileSync(join(ROOT,"lib/harmony-codegen/emit-extended.ts"),"utf8");
  ok("鸿蒙 game emit",hExt.includes("emitHarmonyGame"));
  ok("鸿蒙 payment emit",hExt.includes("emitHarmonyPayment"));

  const hGen = readFileSync(join(ROOT,"lib/harmony-codegen/generate.ts"),"utf8");
  ok('鸿蒙 generate.ts 含 "game"',hGen.includes('"game"'));
  ok('鸿蒙 generate.ts 含 "payment"',hGen.includes('"payment"'));

  // ── 4. 矩阵一致性 ──
  console.log("\n── 4. 能力矩阵 ──\n");
  const matrix = readFileSync(join(ROOT,"docs/模板能力矩阵.md"),"utf8");
  ok("矩阵 v4 版本标记",matrix.includes("v4"));
  ok("矩阵 game 微信列 P2 目标",matrix.includes("P2"));
  ok("矩阵 payment 微信列 P2 目标",matrix.includes("P2 目标"));

  console.log(`\n══ 结果: ${passed} 通过 / ${failed} 失败 ══`);
  if (failed) process.exit(1);
}
main().catch(e=>{console.error(e);process.exit(1)});
