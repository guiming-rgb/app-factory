#!/usr/bin/env node
/**
 * WeChat 小程序性能预算验证
 *
 * 用法: npx tsx scripts/verify-performance-wechat.mjs
 *
 * 验证项：
 *   1. 3 行业 (ecommerce / social / food) 项目生成
 *   2. 生成文件大小总预算 < 2MB
 *   3. 每页 .js 文件 < 50KB
 *   4. .wxss 文件总大小 < 200KB
 *   5. 图片资源 < 100KB（如有）
 */
import { existsSync, statSync, readdirSync, readFileSync } from "fs";
import { join, dirname, extname, relative, sep } from "path";
import { fileURLToPath } from "url";
import { rm } from "fs/promises";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

// ============================================================
// 行业样本规格定义
// ============================================================

const INDUSTRIES = [
  {
    id: "ecommerce",
    spec: {
      specVersion: "0.1.0",
      appName: "wechat_perf_shop",
      displayName: "微信商城",
      metadata: { category: "ecommerce" },
      targets: {
        flutter: { enabled: false },
        wechatMiniProgram: {
          enabled: true,
          tabBar: ["product_list", "profile"],
          loginMethod: "wechat",
          subPackages: [],
        },
        harmony: { enabled: false },
        backend: { provider: "supabase", regionHint: "ap-east" },
      },
      entities: [
        {
          name: "Product",
          fields: [
            { name: "id", type: "uuid", primary: true },
            { name: "title", type: "string" },
            { name: "price", type: "number" },
          ],
        },
      ],
      screens: [
        { id: "home", title: "首页", type: "tabRoot", children: ["product_list", "profile"] },
        { id: "product_list", title: "商品", type: "list", entity: "Product" },
        { id: "profile", title: "我的", type: "placeholder" },
      ],
      navigation: { tabs: ["product_list", "profile"] },
      roles: [{ name: "user" }],
      auth: { provider: "supabase", methods: ["email"], roles: ["user"] },
      api: [],
      limitations: ["微信性能压测专用"],
      complianceFlags: { templateLimited: false },
    },
  },
  {
    id: "social",
    spec: {
      specVersion: "0.1.0",
      appName: "wechat_perf_social",
      displayName: "微信社交",
      metadata: { category: "social" },
      targets: {
        flutter: { enabled: false },
        wechatMiniProgram: {
          enabled: true,
          tabBar: ["feed_list", "profile"],
          loginMethod: "wechat",
          subPackages: [],
        },
        harmony: { enabled: false },
        backend: { provider: "supabase", regionHint: "ap-east" },
      },
      entities: [
        {
          name: "Post",
          fields: [
            { name: "id", type: "uuid", primary: true },
            { name: "content", type: "string" },
          ],
        },
      ],
      screens: [
        { id: "home", title: "首页", type: "tabRoot", children: ["feed_list", "profile"] },
        { id: "feed_list", title: "动态", type: "list", entity: "Post" },
        { id: "profile", title: "我的", type: "placeholder" },
      ],
      navigation: { tabs: ["feed_list", "profile"] },
      roles: [{ name: "user" }],
      auth: { provider: "supabase", methods: ["email"], roles: ["user"] },
      api: [],
      limitations: ["微信性能压测专用"],
      complianceFlags: { templateLimited: false },
    },
  },
  {
    id: "food",
    spec: {
      specVersion: "0.1.0",
      appName: "wechat_perf_food",
      displayName: "微信美食",
      metadata: { category: "food" },
      targets: {
        flutter: { enabled: false },
        wechatMiniProgram: {
          enabled: true,
          tabBar: ["menu_list", "profile"],
          loginMethod: "wechat",
          subPackages: [],
        },
        harmony: { enabled: false },
        backend: { provider: "supabase", regionHint: "ap-east" },
      },
      entities: [
        {
          name: "Dish",
          fields: [
            { name: "id", type: "uuid", primary: true },
            { name: "name", type: "string" },
            { name: "price", type: "number" },
          ],
        },
      ],
      screens: [
        { id: "home", title: "首页", type: "tabRoot", children: ["menu_list", "profile"] },
        { id: "menu_list", title: "菜单", type: "list", entity: "Dish" },
        { id: "profile", title: "我的", type: "placeholder" },
      ],
      navigation: { tabs: ["menu_list", "profile"] },
      roles: [{ name: "customer" }],
      auth: { provider: "supabase", methods: ["email"], roles: ["customer"] },
      api: [],
      limitations: ["微信性能压测专用"],
      complianceFlags: { templateLimited: false },
    },
  },
];

// ============================================================
// 辅助函数
// ============================================================

const IMAGE_EXTS = new Set([".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp", ".ico"]);

/** 递归遍历目录，返回所有文件列表 */
function walkDir(dir) {
  const files = [];
  if (!existsSync(dir)) return files;
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkDir(full));
    } else if (entry.isFile()) {
      files.push(full);
    }
  }
  return files;
}

/** 按扩展名对文件分组 */
function groupByExt(files) {
  const groups = {};
  for (const f of files) {
    const ext = extname(f).toLowerCase();
    if (!groups[ext]) groups[ext] = [];
    groups[ext].push(f);
  }
  return groups;
}

/** 计算一组文件的总大小（KB） */
function totalSizeKB(files) {
  return files.reduce((sum, f) => sum + statSync(f).size, 0) / 1024;
}

/** 找到最大文件大小（KB） */
function maxSizeKB(files) {
  if (files.length === 0) return 0;
  return Math.max(...files.map((f) => statSync(f).size)) / 1024;
}

let passCount = 0;
let failCount = 0;

function report(label, status, detail = "") {
  const icon = status === "pass" ? "✓" : "✗";
  console.log(`  ${icon} ${label}${detail ? " — " + detail : ""}`);
  if (status === "pass") passCount++;
  else failCount++;
}

// ============================================================
// 入口
// ============================================================

async function main() {
  console.log("══ 微信小程序性能预算验证 ══\n");

  // ── 1. 加载生成函数 ──
  let generateWechatProject;
  try {
    const mod = await import("../lib/wechat-codegen/generate.ts");
    generateWechatProject = mod.generateWechatProject;
    report("generateWechatProject 加载", "pass");
  } catch (err) {
    report("generateWechatProject 加载", "fail", err.message);
    finalize();
    process.exit(1);
  }

  // ── 2. 加载预算 ──
  let PERF_BUDGETS, checkBudget;
  try {
    const budget = await import("../lib/codegen/perf-budget.ts");
    PERF_BUDGETS = budget.PERF_BUDGETS;
    checkBudget = budget.checkBudget;
    report("perf-budget 加载", "pass");
  } catch (err) {
    report("perf-budget 加载", "fail", err.message);
    finalize();
    process.exit(1);
  }

  // ── 3. 逐个行业生成 ──
  const generatedDirs = [];
  console.log("\n── 3. 项目生成 ──\n");

  for (const ind of INDUSTRIES) {
    try {
      const result = await generateWechatProject(ind.spec);
      generatedDirs.push({ id: ind.id, dir: result.outputDir });
      report(`${ind.id} 生成`, "pass", result.appName);
    } catch (err) {
      report(`${ind.id} 生成`, "fail", err.message?.slice(0, 200) || String(err));
    }
  }

  // ── 4. 逐个分析 ──
  console.log("\n── 4. 文件大小预算 ──\n");

  for (const g of generatedDirs) {
    if (!existsSync(g.dir)) {
      report(`${g.id}`, "fail", "生成目录缺失");
      continue;
    }

    console.log(`  [${g.id}] ${relative(ROOT, g.dir)}`);

    const allFiles = walkDir(g.dir);
    const groups = groupByExt(allFiles);

    // ---- 4a. 总大小 < 2MB ----
    const totalKB = totalSizeKB(allFiles);
    const totalCheck = checkBudget("wechat", { totalSizeKB: Math.round(totalKB) });
    report(
      `${g.id} 总大小`,
      totalCheck.pass ? "pass" : "fail",
      `${totalKB.toFixed(1)} KB (预算: ${PERF_BUDGETS.wechat.totalSizeKB} KB)`,
    );
    if (!totalCheck.pass) {
      for (const f of totalCheck.failures) console.log(`    ⚠ ${f}`);
    }

    // ---- 4b. 每页 .js < 50KB ----
    const pageJSExts = new Set([".js"]);
    const jsFiles = (groups[".js"] || []).filter(
      (f) =>
        f.includes("/pages/") &&
        !f.includes("node_modules") &&
        !f.endsWith("app.js"),
    );
    const jsSizeOK = { pass: true, oversize: [] };
    for (const f of jsFiles) {
      const kb = statSync(f).size / 1024;
      if (kb > PERF_BUDGETS.wechat.perPageJS_KB) {
        jsSizeOK.pass = false;
        jsSizeOK.oversize.push({ file: relative(g.dir, f), sizeKB: kb });
      }
    }
    if (jsSizeOK.pass) {
      report(`${g.id} 页面 JS 单文件`, "pass", `最大 ${maxSizeKB(jsFiles).toFixed(1)} KB (预算 50 KB)`);
    } else {
      for (const o of jsSizeOK.oversize) {
        report(
          `${g.id} 页面 JS`,
          "fail",
          `${o.file}: ${o.sizeKB.toFixed(1)} KB (预算 50 KB)`,
        );
      }
    }

    // ---- 4c. .wxss 总大小 < 200KB ----
    const wxssFiles = groups[".wxss"] || [];
    const wxssKB = totalSizeKB(wxssFiles);
    if (wxssKB <= PERF_BUDGETS.wechat.wxssTotalKB) {
      report(`${g.id} wxss 总大小`, "pass", `${wxssKB.toFixed(1)} KB (预算 200 KB)`);
    } else {
      report(`${g.id} wxss 总大小`, "fail", `${wxssKB.toFixed(1)} KB (预算 200 KB)`);
    }

    // ---- 4d. 图片资源 < 100KB ----
    const imageFiles = [];
    for (const ext of IMAGE_EXTS) {
      if (groups[ext]) imageFiles.push(...groups[ext]);
    }
    if (imageFiles.length === 0) {
      report(`${g.id} 图片`, "pass", "无图片资源（跳过）");
    } else {
      const maxImgKB = maxSizeKB(imageFiles);
      if (maxImgKB <= PERF_BUDGETS.wechat.imageAssetKB) {
        report(
          `${g.id} 图片`,
          "pass",
          `${imageFiles.length} 文件, 最大 ${maxImgKB.toFixed(1)} KB (预算 100 KB)`,
        );
      } else {
        const oversized = imageFiles
          .filter((f) => statSync(f).size / 1024 > PERF_BUDGETS.wechat.imageAssetKB)
          .map((f) => `${relative(g.dir, f)} (${(statSync(f).size / 1024).toFixed(1)} KB)`);
        for (const o of oversized) {
          report(`${g.id} 图片`, "fail", o);
        }
      }
    }

    // ---- 4e. 文件类型分布明细 ----
    console.log(`    明细:`);
    for (const [ext, files] of Object.entries(groups).sort()) {
      const kb = totalSizeKB(files);
      if (kb > 0.5) {
        console.log(`      ${ext}: ${files.length} 文件, ${kb.toFixed(1)} KB`);
      }
    }
    console.log("");
  }

  // ── 5. 清理 ──
  const cleaned = new Set();
  for (const g of generatedDirs) {
    const parent = g.dir.split("/").slice(0, -1).join("/") || "/tmp";
    if (parent !== "/" && parent !== g.dir && !cleaned.has(parent)) {
      cleaned.add(parent);
      await rm(parent, { recursive: true, force: true }).catch(() => {});
    }
  }

  // ── 6. 汇总 ──
  finalize();
}

function finalize() {
  console.log("══ 汇总 ══");
  console.log(`  ✓ 通过: ${passCount}`);
  console.log(`  ✗ 失败: ${failCount}`);
  const allPass = failCount === 0;
  console.log(allPass ? "\n✅ 微信小程序性能预算验证通过" : "\n❌ 微信小程序性能预算验证未通过");
  if (!allPass) process.exit(1);
}

main().catch((err) => {
  console.error("\n❌ 脚本异常:", err.message);
  process.exit(1);
});
