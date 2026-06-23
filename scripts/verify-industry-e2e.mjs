#!/usr/bin/env node
/**
 * npm run verify:industry:e2e
 * 19 行业端到端：Spec → Flutter 工程生成 → 结构验证
 */
import { existsSync, readdirSync, statSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

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
  if (cond) { console.log(`  ✓ ${label}${detail ? ' - ' + detail : ''}`); passed++; }
  else { console.error(`  ✗ ${label}${detail ? ' - ' + detail : ''}`); failed++; }
}

async function main() {
  console.log("══ 19 行业端到端验证 ══\n");

  // ─── 动态加载 generateFlutterProject ───
  let generateFlutterProject;
  try {
    const mod = await import("../lib/flutter-codegen/generate.ts");
    generateFlutterProject = mod.generateFlutterProject;
    check("generateFlutterProject 加载", true);
  } catch (e) {
    console.error("❌ 无法加载 generateFlutterProject:", e.message);
    process.exit(1);
  }

  for (const { ind, name, displayName, screens } of ALL_INDUSTRIES) {
    console.log(`\n── ${name} (${ind}) ──`);

    const spec = {
      specVersion: "0.1.0",
      appName: `test_${ind}`,
      displayName,
      targets: { flutter: { enabled: true, platforms: ["ios","android"], formFactors: ["phone"] }, backend: { provider: "supabase" } },
      screens: [{ id: "home", title: "首页", type: "tabRoot" }, ...screens, { id: "profile", title: "我的", type: "placeholder" }],
      entities: screens.filter(s => s.entity).map(s => {
        const tbl = s.entity || "items";
        return { name: tbl, fields: [{ name: "id", type: "uuid", primary: true }, { name: "title", type: "string" }, { name: "created_at", type: "datetime" }] };
      }),
      navigation: { tabs: ["home", screens[0]?.id || "list", "profile"].slice(0, 3) },
      limitations: ["端到端验证"],
      metadata: { category: ind }
    };

    try {
      const result = await generateFlutterProject(spec, { keepOutput: true });
      check("生成成功", !!result.outputDir, result.appName);

      // 检查行业模板文件是否被拷贝
      const templateDir = join(ROOT, "templates", `industry-${ind}`, "lib", "features", ind);
      const hasTemplate = existsSync(templateDir);

      if (hasTemplate) {
        const modelFiles = readdirSync(join(templateDir, "models")).filter(f => f.endsWith(".dart"));
        const pageFiles = readdirSync(join(templateDir, "pages")).filter(f => f.endsWith(".dart"));
        check("models", modelFiles.length > 0, `${modelFiles.length} 文件`);
        check("pages", pageFiles.length >= 2, `${pageFiles.length} 文件`);
      }

      // 清理
      const { rm } = await import("fs/promises");
      const tmpRoot = result.outputDir.split("/").slice(0, -1).join("/");
      await rm(tmpRoot, { recursive: true, force: true }).catch(() => {});

    } catch (e) {
      console.error(`  ✗ 失败: ${e.message}`);
      failed++;
    }
  }

  console.log(`\n══ 结果: ${passed} 通过 / ${failed} 失败 ══`);
  if (failed > 0) process.exit(1);
}

main().catch(e => { console.error(e); process.exit(1); });
