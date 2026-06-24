#!/usr/bin/env node
/**
 * Harmony 应用性能预算验证
 *
 * 用法: npx tsx scripts/verify-performance-harmony.mjs
 *
 * 验证项：
 *   1. 3 行业 (finance / medical / sports) 项目生成
 *   2. .ets 文件总大小 < 500KB
 *   3. main_pages.json 页面数 < 20
 *   4. 模块数（.ets 文件数）< 30（冷启动开销预估）
 */
import { existsSync, statSync, readdirSync, readFileSync } from "fs";
import { join, dirname, extname, relative } from "path";
import { fileURLToPath } from "url";
import { rm } from "fs/promises";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

// ============================================================
// 行业样本规格定义
// ============================================================

const INDUSTRIES = [
  {
    id: "finance",
    spec: {
      specVersion: "0.1.0",
      appName: "harmony_perf_finance",
      displayName: "鸿蒙记账",
      metadata: { category: "finance" },
      targets: {
        flutter: { enabled: false },
        wechatMiniProgram: { enabled: false },
        harmony: { enabled: true, formFactors: ["phone", "tablet"] },
        backend: { provider: "supabase", regionHint: "ap-east" },
      },
      entities: [
        {
          name: "Transaction",
          fields: [
            { name: "id", type: "uuid", primary: true },
            { name: "amount", type: "number" },
            { name: "category", type: "string" },
            { name: "date", type: "string" },
          ],
        },
      ],
      screens: [
        { id: "home", title: "首页", type: "tabRoot", children: ["transaction_list", "profile"] },
        { id: "transaction_list", title: "账单", type: "list", entity: "Transaction" },
        { id: "profile", title: "我的", type: "placeholder" },
      ],
      navigation: { tabs: ["transaction_list", "profile"] },
      roles: [{ name: "user" }],
      auth: { provider: "supabase", methods: ["email"], roles: ["user"] },
      api: [],
      limitations: ["鸿蒙性能压测专用"],
      complianceFlags: { templateLimited: false },
    },
  },
  {
    id: "medical",
    spec: {
      specVersion: "0.1.0",
      appName: "harmony_perf_medical",
      displayName: "鸿蒙问诊",
      metadata: { category: "medical" },
      targets: {
        flutter: { enabled: false },
        wechatMiniProgram: { enabled: false },
        harmony: { enabled: true, formFactors: ["phone", "tablet"] },
        backend: { provider: "supabase", regionHint: "ap-east" },
      },
      entities: [
        {
          name: "Appointment",
          fields: [
            { name: "id", type: "uuid", primary: true },
            { name: "patientName", type: "string" },
            { name: "doctorName", type: "string" },
            { name: "date", type: "string" },
          ],
        },
      ],
      screens: [
        { id: "home", title: "首页", type: "tabRoot", children: ["appointment_list", "profile"] },
        { id: "appointment_list", title: "预约", type: "list", entity: "Appointment" },
        { id: "profile", title: "我的", type: "placeholder" },
      ],
      navigation: { tabs: ["appointment_list", "profile"] },
      roles: [{ name: "patient" }],
      auth: { provider: "supabase", methods: ["email"], roles: ["patient"] },
      api: [],
      limitations: ["鸿蒙性能压测专用"],
      complianceFlags: { templateLimited: false },
    },
  },
  {
    id: "sports",
    spec: {
      specVersion: "0.1.0",
      appName: "harmony_perf_sports",
      displayName: "鸿蒙体育",
      metadata: { category: "sports" },
      targets: {
        flutter: { enabled: false },
        wechatMiniProgram: { enabled: false },
        harmony: { enabled: true, formFactors: ["phone", "tablet"] },
        backend: { provider: "supabase", regionHint: "ap-east" },
      },
      entities: [
        {
          name: "Team",
          fields: [
            { name: "id", type: "uuid", primary: true },
            { name: "name", type: "string" },
            { name: "rank", type: "number" },
          ],
        },
      ],
      screens: [
        { id: "home", title: "首页", type: "tabRoot", children: ["team_list", "profile"] },
        { id: "team_list", title: "球队", type: "list", entity: "Team" },
        { id: "profile", title: "我的", type: "placeholder" },
        { id: "match_schedule", title: "赛程", type: "placeholder" },
      ],
      navigation: { tabs: ["team_list", "match_schedule", "profile"] },
      roles: [{ name: "fan" }],
      auth: { provider: "supabase", methods: ["email"], roles: ["fan"] },
      api: [],
      limitations: ["鸿蒙性能压测专用"],
      complianceFlags: { templateLimited: false },
    },
  },
];

// ============================================================
// 辅助函数
// ============================================================

/** 递归遍历目录，返回所有文件列表 */
function walkDir(dir) {
  const files = [];
  if (!existsSync(dir)) return files;
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!entry.name.startsWith(".") && entry.name !== "node_modules") {
        files.push(...walkDir(full));
      }
    } else if (entry.isFile()) {
      files.push(full);
    }
  }
  return files;
}

/** 计算一组文件的总大小（KB） */
function totalSizeKB(files) {
  return files.reduce((sum, f) => sum + statSync(f).size, 0) / 1024;
}

/** 查找 main_pages.json 并返回 src 数组 */
function readMainPages(appDir) {
  const paths = [
    "entry/src/main/resources/base/profile/main_pages.json",
    "entry/src/main/resources/base/profile/main_pages.json5",
  ];
  for (const rel of paths) {
    const full = join(appDir, rel);
    if (existsSync(full)) {
      try {
        const raw = readFileSync(full, "utf8");
        // Handle JSON5 (remove comments, trailing commas) for parsing
        const cleaned = raw
          .replace(/\/\/.*$/gm, "")
          .replace(/,\s*([}\]])/g, "$1");
        const parsed = JSON.parse(cleaned);
        return parsed.src || [];
      } catch {
        return [];
      }
    }
  }
  return [];
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
  console.log("══ 鸿蒙应用性能预算验证 ══\n");

  // ── 1. 加载生成函数 ──
  let generateHarmonyProject;
  try {
    const mod = await import("../lib/harmony-codegen/generate.ts");
    generateHarmonyProject = mod.generateHarmonyProject;
    report("generateHarmonyProject 加载", "pass");
  } catch (err) {
    report("generateHarmonyProject 加载", "fail", err.message);
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
      const result = await generateHarmonyProject(ind.spec);
      generatedDirs.push({ id: ind.id, dir: result.outputDir });
      report(`${ind.id} 生成`, "pass", result.appName);
    } catch (err) {
      report(`${ind.id} 生成`, "fail", err.message?.slice(0, 200) || String(err));
    }
  }

  // ── 4. 逐个分析 ──
  console.log("\n── 4. 性能预算校验 ──\n");

  for (const g of generatedDirs) {
    if (!existsSync(g.dir)) {
      report(`${g.id}`, "fail", "生成目录缺失");
      continue;
    }

    console.log(`  [${g.id}] ${relative(ROOT, g.dir)}`);

    const allFiles = walkDir(g.dir);

    // ---- 4a. .ets 文件总大小 < 500KB ----
    const etsFiles = allFiles.filter((f) => extname(f).toLowerCase() === ".ets");
    const etsKB = totalSizeKB(etsFiles);
    const etsCheck = checkBudget("harmony", { etsSizeKB: Math.round(etsKB) });

    if (etsCheck.pass) {
      report(`${g.id} .ets 总大小`, "pass", `${etsKB.toFixed(1)} KB (${etsFiles.length} 文件)`);
    } else {
      report(`${g.id} .ets 总大小`, "fail", `${etsKB.toFixed(1)} KB (预算 ${PERF_BUDGETS.harmony.etsSizeKB} KB)`);
      for (const f of etsCheck.failures) console.log(`    ⚠ ${f}`);
    }

    // ---- 4b. main_pages.json 页面数 < 20 ----
    const mainPages = readMainPages(g.dir);
    const pageCount = mainPages.length;
    const pageCheck = checkBudget("harmony", { maxPages: pageCount });

    if (pageCheck.pass) {
      report(`${g.id} main_pages`, "pass", `${pageCount} 页面`);
    } else {
      report(`${g.id} main_pages`, "fail", `${pageCount} 页面 (预算 ${PERF_BUDGETS.harmony.maxPages})`);
    }

    // ---- 4c. 模块数（.ets 文件数）< 30 ----
    const moduleCount = etsFiles.length;
    const moduleCheck = checkBudget("harmony", { maxModules: moduleCount });

    if (moduleCheck.pass) {
      report(`${g.id} 模块数`, "pass", `${moduleCount} 模块`);
    } else {
      report(`${g.id} 模块数`, "fail", `${moduleCount} 模块 (预算 ${PERF_BUDGETS.harmony.maxModules})`);
    }

    // ---- 4d. .ets 文件分布明细 ----
    console.log("    .ets 文件分布:");
    const etsByDir = {};
    for (const f of etsFiles) {
      const d = dirname(relative(g.dir, f));
      etsByDir[d] = (etsByDir[d] || 0) + 1;
    }
    for (const [d, count] of Object.entries(etsByDir).sort()) {
      console.log(`      ${d}/: ${count} files`);
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
  console.log(allPass ? "\n✅ 鸿蒙应用性能预算验证通过" : "\n❌ 鸿蒙应用性能预算验证未通过");
  if (!allPass) process.exit(1);
}

main().catch((err) => {
  console.error("\n❌ 脚本异常:", err.message);
  process.exit(1);
});
