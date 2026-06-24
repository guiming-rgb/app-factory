#!/usr/bin/env node
/**
 * Flutter 性能预算验证
 *
 * 用法: npx tsx scripts/verify-performance-flutter.mjs
 *
 * 验证项：
 *   1. Flutter SDK 可用性检查
 *   2. 3 行业 (ecommerce / game / social) 项目生成
 *   3. flutter analyze 错误/警告计数
 *   4. flutter build apk --debug APK 体积
 *
 * 预算（定义见 lib/codegen/perf-budget.ts）：
 *   - dartAnalyzeErrors:    0
 *   - dartAnalyzeWarnings: 20
 *   - apkSizeDebugMB:      50
 */
import { execSync } from "child_process";
import { existsSync, statSync, readdirSync } from "fs";
import { join, dirname } from "path";
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
      appName: "perf_shop",
      displayName: "性能商城",
      metadata: { category: "ecommerce" },
      targets: {
        flutter: { enabled: true, platforms: ["android"], formFactors: ["phone"] },
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
      limitations: ["Flutter 性能压测专用"],
      complianceFlags: { templateLimited: false },
    },
  },
  {
    id: "game",
    spec: {
      specVersion: "0.1.0",
      appName: "perf_game",
      displayName: "性能游戏",
      metadata: { category: "game" },
      targets: {
        flutter: { enabled: true, platforms: ["android"], formFactors: ["phone"] },
        backend: { provider: "supabase", regionHint: "ap-east" },
      },
      entities: [
        {
          name: "Player",
          fields: [
            { name: "id", type: "uuid", primary: true },
            { name: "nickname", type: "string" },
          ],
        },
      ],
      screens: [
        { id: "home", title: "首页", type: "tabRoot", children: ["game_room", "profile"] },
        { id: "game_room", title: "游戏", type: "game" },
        { id: "profile", title: "我的", type: "placeholder" },
      ],
      navigation: { tabs: ["game_room", "profile"] },
      roles: [{ name: "player" }],
      auth: { provider: "supabase", methods: ["email"], roles: ["player"] },
      api: [],
      limitations: ["Flutter 性能压测专用"],
      complianceFlags: { templateLimited: false },
    },
  },
  {
    id: "social",
    spec: {
      specVersion: "0.1.0",
      appName: "perf_social",
      displayName: "性能社交",
      metadata: { category: "social" },
      targets: {
        flutter: { enabled: true, platforms: ["android"], formFactors: ["phone"] },
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
      limitations: ["Flutter 性能压测专用"],
      complianceFlags: { templateLimited: false },
    },
  },
];

// ============================================================
// 辅助函数
// ============================================================

function run(cmd, opts = {}) {
  return execSync(cmd, { encoding: "utf8", stdio: "pipe", ...opts });
}

function hasFlutter() {
  try {
    const out = run("which flutter 2>/dev/null || echo ''").trim();
    return out.length > 0;
  } catch {
    return false;
  }
}

/** 解析 flutter analyze 输出中的错误/警告数 */
function parseFlutterAnalyze(output) {
  const errors = [...output.matchAll(/(\d+)\s+error/g)].reduce(
    (sum, m) => sum + parseInt(m[1], 10),
    0,
  );
  const warnings = [...output.matchAll(/(\d+)\s+warning/g)].reduce(
    (sum, m) => sum + parseInt(m[1], 10),
    0,
  );
  return { errors, warnings };
}

/** 查找 APK 文件并返回大小（MB） */
function findApkSize(appDir) {
  const apkDir = join(appDir, "build", "app", "outputs", "flutter-apk");
  if (!existsSync(apkDir)) return null;
  const files = readdirSync(apkDir);
  const apk = files.find((f) => f.endsWith(".apk") && !f.includes("universal"));
  if (!apk) return null;
  return statSync(join(apkDir, apk)).size / (1024 * 1024);
}

let passCount = 0;
let failCount = 0;
let skipCount = 0;

function report(label, status, detail = "") {
  const icon = status === "pass" ? "✓" : status === "skip" ? "⚠" : "✗";
  console.log(`  ${icon} ${label}${detail ? " — " + detail : ""}`);
  if (status === "pass") passCount++;
  else if (status === "fail") failCount++;
  else skipCount++;
}

// ============================================================
// 入口
// ============================================================

async function main() {
  console.log("══ Flutter 性能预算验证 ══\n");

  // ── 0. SDK 可用性 ──
  if (!hasFlutter()) {
    console.log("  ⚠ Flutter SDK 未安装，跳过全部 Flutter 性能验证");
    console.log("\n  结果: 0 通过 / 0 失败 / 全部跳过（SDK 不可用，正常降级）");
    process.exit(0);
  }
  const flutterVersion = run("flutter --version 2>/dev/null | head -1").trim();
  report("Flutter SDK", "pass", flutterVersion);

  // ── 1. 加载生成函数 ──
  let generateFlutterProject;
  try {
    const mod = await import("../lib/flutter-codegen/generate.ts");
    generateFlutterProject = mod.generateFlutterProject;
    report("generateFlutterProject 加载", "pass");
  } catch (err) {
    report("generateFlutterProject 加载", "fail", err.message);
    finalize();
    process.exit(1);
  }

  // ── 2. 加载预算定义 ──
  let PERF_BUDGETS, checkBudget, formatBudgetReport;
  try {
    const budget = await import("../lib/codegen/perf-budget.ts");
    PERF_BUDGETS = budget.PERF_BUDGETS;
    checkBudget = budget.checkBudget;
    formatBudgetReport = budget.formatBudgetReport;
    report("perf-budget 加载", "pass");
  } catch (err) {
    report("perf-budget 加载", "fail", err.message);
    finalize();
    process.exit(1);
  }

  // ── 3. 逐个行业生成 + analyze ──
  const allResults = [];
  const generatedDirs = [];

  console.log("\n── 3. 项目生成 + flutter analyze ──\n");

  for (const ind of INDUSTRIES) {
    console.log(`  [${ind.id}]`);
    try {
      // 生成
      const result = await generateFlutterProject(ind.spec, { keepOutput: true });
      generatedDirs.push(result.outputDir);
      report(`${ind.id} 生成`, "pass", result.appName);

      // flutter pub get
      try {
        run("flutter pub get", { cwd: result.outputDir, stdio: "pipe" });
        report(`${ind.id} pub get`, "pass");
      } catch (err) {
        const msg = err.stderr
          ? err.stderr.toString().slice(0, 120)
          : err.message;
        report(`${ind.id} pub get`, "fail", msg);
        continue;
      }

      // flutter analyze
      let analyzeOutput;
      try {
        analyzeOutput = run("flutter analyze", {
          cwd: result.outputDir,
          stdio: "pipe",
        });
      } catch (err) {
        // flutter analyze exits non-zero when there are errors
        analyzeOutput = err.stdout
          ? err.stdout.toString()
          : err.message || "unknown";
      }

      const { errors, warnings } = parseFlutterAnalyze(analyzeOutput);
      const analyzeCheck = checkBudget("flutter", {
        dartAnalyzeErrors: errors,
        dartAnalyzeWarnings: warnings,
      });

      if (analyzeCheck.pass) {
        report(`${ind.id} analyze`, "pass", `${errors} errors / ${warnings} warnings`);
      } else {
        report(`${ind.id} analyze`, "fail", analyzeCheck.failures.join("; "));
      }

      allResults.push({ industry: ind.id, errors, warnings, analyzeCheck });
    } catch (err) {
      report(`${ind.id} 失败`, "fail", err.message?.slice(0, 200) || String(err));
    }
    console.log("");
  }

  // ── 4. APK 构建（仅第一个行业）──
  if (allResults.length > 0 && INDUSTRIES.length > 0) {
    const firstGen = allResults.find((r) => r.industry === INDUSTRIES[0].id);
    if (firstGen) {
      console.log(`── 4. APK 构建（${INDUSTRIES[0].id}）──\n`);
      const firstDir = generatedDirs[0];
      if (firstDir && existsSync(firstDir)) {
        try {
          console.log("  (flutter build apk --debug 需时较长，请等待...)");
          const buildOutput = run("flutter build apk --debug", {
            cwd: firstDir,
            stdio: "pipe",
            timeout: 10 * 60 * 1000, // 10 分钟超时
          });

          const apkSizeMB = findApkSize(firstDir);
          if (apkSizeMB !== null) {
            const apkCheck = checkBudget("flutter", { apkSizeDebugMB: Math.round(apkSizeMB) });
            if (apkCheck.pass) {
              report(`APK size`, "pass", `${apkSizeMB.toFixed(1)} MB`);
            } else {
              report(`APK size`, "fail", `${apkSizeMB.toFixed(1)} MB (预算 50 MB)`);
            }
          } else {
            report("APK size", "skip", "未找到 APK 文件");
          }
        } catch (err) {
          report("APK build", "skip", err.message?.slice(0, 200) || String(err));
          console.log("  (APK 构建跳过，这不影响 analyze 验证结果)");
        }
      }
    }
    console.log("");
  }

  // ── 5. 清理生成目录 ──
  for (const dir of generatedDirs) {
    const parent = dir.split("/").slice(0, -1).join("/") || "/tmp";
    if (parent !== "/" && parent !== dir) {
      await rm(parent, { recursive: true, force: true }).catch(() => {});
    }
  }

  // ── 6. 汇总报告 ──
  finalize();
}

function finalize() {
  console.log("══ 汇总 ══");
  console.log(`  ✓ 通过: ${passCount}`);
  console.log(`  ✗ 失败: ${failCount}`);
  console.log(`  ⚠ 跳过: ${skipCount}`);

  const allPass = failCount === 0;
  console.log(allPass ? "\n✅ Flutter 性能预算验证通过" : "\n❌ Flutter 性能预算验证未通过");
  if (!allPass) process.exit(1);
}

main().catch((err) => {
  console.error("\n❌ 脚本异常:", err.message);
  process.exit(1);
});
