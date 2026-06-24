#!/usr/bin/env node
/**
 * P1 微信 wcc 行业抽样门禁 (B-3 + C-2)
 *
 * 用法: npx tsx scripts/verify-wechat-wcc-industries.mjs
 *
 * 对 5 个抽样行业（finance, ecommerce, food, game, payment）：
 *   1. 通过 generateWechatProject 生成项目
 *   2. 结构校验：app.json 有 pages、project.config.json 有 appid、
 *      所有 page 目录有 .wxml/.js/.json/.wxss
 *   3. industry.json 存在且 industry 字段正确
 *   4. services/industry.js 导出全部 19 个服务名
 *   5. 页面 .js 文件正确 require services/industry
 *   6. 如果 miniprogram-compiler 可用则运行 wcc/wcsc 编译
 */

import { existsSync, readFileSync, readdirSync, statSync, rmSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const require = createRequire(import.meta.url);

// ── 5 抽样行业 ──────────────────────────────────────────────────────
const SAMPLE_INDUSTRIES = ["finance", "ecommerce", "food", "game", "payment"];

// 全 19 个行业服务名（用于检查 services/industry.js 导出）
const ALL_SERVICE_NAMES = [
  "financeService", "crmService", "fitnessService", "ecommerceService",
  "educationService", "socialService", "foodService", "hotelService",
  "recruitmentService", "propertyService", "videoService", "weatherService",
  "sportsService", "photoService", "datingService", "medicalService",
  "blogService", "gameService", "paymentService",
];

let passed = 0;
let failed = 0;
let skipped = 0;

function check(label, cond, detail = "") {
  if (cond) {
    console.log(`  ✓ ${label}${detail ? ` — ${detail}` : ""}`);
    passed++;
    return true;
  }
  console.error(`  ✗ ${label}${detail ? ` — ${detail}` : ""}`);
  failed++;
  return false;
}

function skip(label, reason) {
  console.log(`  ⏭ ${label} — ${reason}`);
  skipped++;
}

/**
 * 检查小程序编译器是否可用
 */
function hasWechatCompiler() {
  try {
    require("miniprogram-compiler");
    return true;
  } catch {
    return false;
  }
}

/**
 * 为指定行业构建生成用 spec
 * 含一个 list screen 以触发行业页面生成
 */
function buildSpec(industry) {
  const entityName = industry === "finance" ? "transactions"
    : industry === "ecommerce" ? "products"
    : industry === "food" ? "restaurants"
    : industry === "game" ? "game_scores"
    : industry === "payment" ? "orders"
    : "items";

  return {
    specVersion: "0.1.0",
    appName: `wx_${industry}_sample`,
    displayName: `${industry} App`,
    targets: {
      flutter: { enabled: false },
      wechatMiniProgram: { enabled: true },
      harmony: { enabled: false },
      backend: { provider: "supabase" },
    },
    screens: [
      { id: "home", title: "首页", type: "tabRoot" },
      {
        id: "main_list",
        title: industry === "food" ? "餐厅列表" : "列表",
        type: "list",
        entity: entityName,
      },
      { id: "profile", title: "我的", type: "placeholder" },
    ],
    entities: [
      {
        name: entityName,
        fields: [
          { name: "id", type: "uuid", primary: true },
          { name: "title", type: "string" },
          { name: "created_at", type: "datetime" },
        ],
      },
    ],
    navigation: {
      tabs: ["home", "main_list", "profile"],
    },
    limitations: ["P1 WeChat wcc 行业抽样探针"],
    metadata: { category: industry },
  };
}

/**
 * 检查所有页面目录文件完整性
 * 返回 { name, files } 数组和缺失计数
 */
function checkPageFiles(appDir, pages) {
  const results = [];

  for (const pagePath of pages) {
    if (pagePath === "pages/index/index" || pagePath === "pages/profile/profile") {
      // 模板自带页面：检查文件存在性
      const pageDir = join(appDir, dirname(pagePath));
      const pageName = pagePath.split("/").pop();

      const wxml = join(pageDir, `${pageName}.wxml`);
      const js = join(pageDir, `${pageName}.js`);
      const json = join(pageDir, `${pageName}.json`);
      const wxss = join(pageDir, `${pageName}.wxss`);

      const files = { wxml: existsSync(wxml), js: existsSync(js), json: existsSync(json), wxss: existsSync(wxss) };
      const missing = Object.entries(files).filter(([, v]) => !v).map(([k]) => k);
      results.push({ page: pagePath, files, missing });
    } else {
      // 其他页面（login, register 以及行业特定页）
      const pageDir = join(appDir, dirname(pagePath));
      const pageName = pagePath.split("/").pop();

      const wxml = join(pageDir, `${pageName}.wxml`);
      const js = join(pageDir, `${pageName}.js`);
      const json = join(pageDir, `${pageName}.json`);
      const wxss = join(pageDir, `${pageName}.wxss`);

      const files = { wxml: existsSync(wxml), js: existsSync(js), json: existsSync(json), wxss: existsSync(wxss) };
      const missing = Object.entries(files).filter(([, v]) => !v).map(([k]) => k);
      results.push({ page: pagePath, files, missing });
    }
  }

  return results;
}

/**
 * 检查页面 .js 是否 require services/industry
 */
function checkPageRequiresIndustry(appDir, pages) {
  const results = [];

  for (const pagePath of pages) {
    const pageName = pagePath.split("/").pop();
    const pageDir = join(appDir, dirname(pagePath));
    const jsPath = join(pageDir, `${pageName}.js`);

    if (!existsSync(jsPath)) {
      results.push({ page: pagePath, hasRequire: false, reason: "文件不存在" });
      continue;
    }

    const content = readFileSync(jsPath, "utf-8");
    const hasRequire =
      content.includes('require("../../services/industry")') ||
      content.includes("require('../../services/industry')") ||
      content.includes('require("../services/industry")') ||
      content.includes("require('../services/industry')");

    results.push({ page: pagePath, hasRequire });
  }

  return results;
}

// ── 主流程 ──────────────────────────────────────────────────────────
async function main() {
  console.log("══ 微信 wcc 行业抽样门禁 (B-3 + C-2) ══\n");

  const compilerAvailable = hasWechatCompiler();
  console.log(`miniprogram-compiler: ${compilerAvailable ? "✓" : "✗"}\n`);

  const { generateWechatProject } = await import(
    join(ROOT, "lib", "wechat-codegen", "generate.ts")
  );

  for (const ind of SAMPLE_INDUSTRIES) {
    const spec = buildSpec(ind);
    let outputDir = null;
    let projectParentDir = null;

    console.log(`\n── ${ind} ──`);

    try {
      // 生成项目
      const result = await generateWechatProject(spec);
      outputDir = result.outputDir;
      projectParentDir = dirname(outputDir);

      // ── 1. 基础结构 ──────────────────────────────────────────────
      const appJsonPath = join(outputDir, "app.json");
      const projectConfigPath = join(outputDir, "project.config.json");
      const industryJsonPath = join(outputDir, "industry.json");
      const industryJsPath = join(outputDir, "services", "industry.js");

      check(`${ind} app.json 存在`, existsSync(appJsonPath));
      check(`${ind} project.config.json 存在`, existsSync(projectConfigPath));
      check(`${ind} industry.json 存在`, existsSync(industryJsonPath));
      check(`${ind} services/industry.js 存在`, existsSync(industryJsPath));

      // ── 2. app.json pages 结构 ──────────────────────────────────
      let appJson;
      try {
        appJson = JSON.parse(readFileSync(appJsonPath, "utf-8"));
        const pages = appJson.pages || [];
        check(`${ind} app.json pages 非空`, pages.length > 0, `${pages.length} 个页面`);
        check(`${ind} app.json 含 index 首页`, pages.includes("pages/index/index"));
        check(`${ind} app.json 含 profile 页`, pages.includes("pages/profile/profile"));
      } catch (e) {
        check(`${ind} app.json 解析`, false, e.message);
        appJson = { pages: [] };
      }

      // ── 3. project.config.json appid ──────────────────────────────
      try {
        const projConfig = JSON.parse(readFileSync(projectConfigPath, "utf-8"));
        check(`${ind} project.config.json appid`, !!projConfig.appid, projConfig.appid);
      } catch (e) {
        check(`${ind} project.config.json 解析`, false, e.message);
      }

      // ── 4. industry.json 内容 ────────────────────────────────────
      try {
        const meta = JSON.parse(readFileSync(industryJsonPath, "utf-8"));
        check(`${ind} industry.json industry 字段`, meta.industry === ind, meta.industry);
        check(`${ind} industry.json servicesModule`, meta.servicesModule === "services/industry.js", meta.servicesModule);
      } catch (e) {
        check(`${ind} industry.json 解析`, false, e.message);
      }

      // ── 5. 页面文件完整性 ─────────────────────────────────────────
      const pages = appJson.pages || [];
      const pageResults = checkPageFiles(outputDir, pages);
      let allPagesComplete = true;
      let totalMissing = 0;

      for (const pr of pageResults) {
        if (pr.missing.length > 0) {
          allPagesComplete = false;
          totalMissing += pr.missing.length;
          check(`${ind} ${pr.page} 文件完整`, false, `缺 ${pr.missing.join(", ")}`);
        }
      }
      if (allPagesComplete) {
        check(`${ind} 所有页面文件完整`, true, `${pages.length} 页面, ${pageResults.reduce((s, r) => s + 4 - r.missing.length, 0)} 文件`);
      }

      // ── 6. services/industry.js 导出全部 19 个服务名 ──────────────
      if (existsSync(industryJsPath)) {
        const industryJsContent = readFileSync(industryJsPath, "utf-8");
        const exportedServices = ALL_SERVICE_NAMES.filter((sn) =>
          industryJsContent.includes(`const ${sn}`) || industryJsContent.includes(`const ${sn} `)
        );
        const missingServices = ALL_SERVICE_NAMES.filter((sn) => !exportedServices.includes(sn));

        check(
          `${ind} services/industry.js 导出 19 个服务`,
          missingServices.length === 0,
          missingServices.length > 0
            ? `缺: ${missingServices.join(", ")}`
            : `${exportedServices.length} 个服务均已导出`
        );
      }

      // ── 7. 页面 .js 对 services/industry 的引用 ──────────────────
      // 仅检查非模板默认页面的 require
      const generatedPages = pages.filter(
        (p) => !["pages/index/index", "pages/profile/profile"].includes(p)
      );
      if (generatedPages.length > 0) {
        const requireResults = checkPageRequiresIndustry(outputDir, generatedPages);
        const allRequire = requireResults.every((r) => r.hasRequire);
        check(
          `${ind} 页面 require services/industry`,
          allRequire,
          allRequire
            ? `${generatedPages.length} 页面均已引用`
            : requireResults
                .filter((r) => !r.hasRequire)
                .map((r) => `${r.page} 缺 require`)
                .join("; ")
        );
      } else {
        // 无生成的页面（仅基础模板页面）
        check(`${ind} 页面 require services/industry`, true, "无额外生成页面");
      }

      // ── 8. wcc/wcsc 编译 ─────────────────────────────────────────
      if (compilerAvailable) {
        try {
          const { runWechatFullBuildValidate } = await import(
            join(ROOT, "lib", "sandbox", "wechat-build.ts")
          );
          const build = runWechatFullBuildValidate({ appDir: outputDir });
          check(
            `${ind} wcc/wcsc 编译`,
            build.status === "passed",
            `${build.structure.status}/${build.compile.status}`
          );
        } catch (e) {
          check(`${ind} wcc/wcsc 编译`, false, e.message?.slice(0, 80) ?? "编译异常");
        }
      } else {
        skip(`${ind} wcc/wcsc 编译`, "未安装 miniprogram-compiler");
      }
    } catch (e) {
      check(`${ind} 项目生成`, false, e.message?.slice(0, 100) ?? "生成失败");
    } finally {
      if (projectParentDir) {
        try { rmSync(projectParentDir, { recursive: true, force: true }); } catch {}
      }
    }
  }

  // ── 最终报告 ──────────────────────────────────────────────────────
  console.log(`\n══ 结果: ${passed} 通过 / ${failed} 失败 / ${skipped} 跳过 ══`);
  if (failed > 0) process.exit(1);
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
