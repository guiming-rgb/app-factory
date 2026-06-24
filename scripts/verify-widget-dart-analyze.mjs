#!/usr/bin/env node
/**
 * P1 Widget dart analyze 门禁 (B-2 + C-1)
 *
 * 用法: npx tsx scripts/verify-widget-dart-analyze.mjs
 *
 * 为全部 19 个行业：
 *   1. 生成 Flutter 项目 (generateFlutterProject)
 *   2. 提取 industry_widgets.dart 文件并验证结构
 *   3. 如果 Flutter SDK 可用则运行 dart analyze
 *   4. 如果 SDK 不可用则检查文件结构（类数 ≥ 1、有效 import、行数 > 50）
 *   报告：逐行业 pass/fail + error 计数
 */

import { existsSync, readFileSync, mkdirSync, writeFileSync, rmSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { spawnSync, execSync } from "child_process";
import { tmpdir } from "os";
import { randomUUID } from "crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

// ── 19 行业列表 ──────────────────────────────────────────────────────
const ALL_INDUSTRIES = [
  "finance", "crm", "fitness", "ecommerce", "education",
  "social", "food", "hotel", "recruitment", "property",
  "video", "weather", "sports", "photo", "dating",
  "medical", "blog", "game", "payment",
];

// ── 状态 ──────────────────────────────────────────────────────────────
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

function hasFlutter() {
  try {
    execSync("flutter --version", { stdio: "pipe", timeout: 30_000 });
    return true;
  } catch {
    return false;
  }
}

function hasDart() {
  try {
    execSync("dart --version", { stdio: "pipe", timeout: 10_000 });
    return true;
  } catch {
    return false;
  }
}

/**
 * 为指定行业构建最小 AppSpec
 * 通过 metadata.category 显式强制 detectIndustry
 */
function buildSpec(industry) {
  return {
    specVersion: "0.1.0",
    appName: `widget_${industry}`,
    displayName: industry,
    targets: {
      flutter: { enabled: true, platforms: ["ios", "android"], formFactors: ["phone"] },
      wechatMiniProgram: { enabled: false },
      harmony: { enabled: false },
      backend: { provider: "supabase" },
    },
    screens: [
      { id: "home", title: "首页", type: "tabRoot" },
      { id: "main_list", title: "列表", type: "list", entity: "items" },
      { id: "profile", title: "我的", type: "placeholder" },
    ],
    entities: [
      {
        name: "items",
        fields: [
          { name: "id", type: "uuid", primary: true },
          { name: "title", type: "string" },
          { name: "created_at", type: "datetime" },
        ],
      },
    ],
    navigation: { tabs: ["home", "main_list", "profile"] },
    limitations: ["P1 Widget analyze 门禁探针"],
    metadata: { category: industry },
  };
}

/**
 * 从生成的 Flutter 项目目录中提取行业 widget 文件
 * 返回 { mustacheFile, legacyFile }
 */
function findWidgetFiles(appDir, industry) {
  const mustachePath = join(appDir, "lib", "core", "widgets", "industry_widgets.dart");
  const legacyPath = join(appDir, "lib", "features", industry, "widgets", `${industry}_widgets.dart`);
  return {
    mustacheWidget: existsSync(mustachePath) ? mustachePath : null,
    legacyWidget: existsSync(legacyPath) ? legacyPath : null,
  };
}

/**
 * 文件结构检查（Flutter SDK 不可用时兜底）
 * - 类定义数 ≥ 1
 * - 有效的 Dart import 语句
 * - 总行数 > 50
 */
function validateFileStructure(filePath) {
  const content = readFileSync(filePath, "utf-8");
  const lines = content.split("\n");
  const classCount = (content.match(/\bclass\s+\w+/g) || []).length;
  const statelessCount = (content.match(/\bclass\s+\w+\s+extends\s+StatelessWidget/g) || []).length;
  const imports = content.match(/^import\s+['"].+['"]\s*;$/gm) || [];
  const importPackages = content.match(/^import\s+['"]package:([^'"]+)['"]\s*;$/gm) || [];

  return {
    lineCount: lines.length,
    classCount,
    statelessWidgetCount: statelessCount,
    importCount: imports.length,
    packageImportCount: importPackages.length,
    hasFlutterMaterial: content.includes('import "package:flutter/material.dart"') || content.includes("import 'package:flutter/material.dart'"),
    isValid: classCount >= 1 && importPackages.length > 0 && lines.length > 50,
  };
}

// ── 主流程 ──────────────────────────────────────────────────────────
async function main() {
  console.log("══ Widget dart analyze 门禁 (B-2 + C-1) ══\n");

  const flutterAvailable = hasFlutter();
  const dartAvailable = hasDart();
  console.log(`Flutter SDK: ${flutterAvailable ? "✓" : "✗"}`);
  console.log(`Dart SDK:   ${dartAvailable ? "✓" : "✗"}\n`);

  if (!dartAvailable && !flutterAvailable) {
    console.log("⚠ Dart SDK 不可用，使用文件结构验证模式（无 dart analyze）\n");
  } else {
    console.log("使用 dart analyze 模式\n");
  }

  const { generateFlutterProject } = await import(
    join(ROOT, "lib", "flutter-codegen", "generate.ts")
  );

  // 存储所有检查结果
  const results = [];

  for (const ind of ALL_INDUSTRIES) {
    const spec = buildSpec(ind);
    let appDir = null;
    let projectDir = null;

    console.log(`\n── ${ind} ──`);

    try {
      // 生成 Flutter 项目
      const result = await generateFlutterProject(spec);
      appDir = result.outputDir;
      projectDir = dirname(appDir);

      // 查找 widget 文件
      const { mustacheWidget, legacyWidget } = findWidgetFiles(appDir, ind);

      if (mustacheWidget) {
        check(`${ind} Mustache widget 文件存在`, true, mustacheWidget);
      } else {
        check(`${ind} Mustache widget 文件存在`, false, "industry_widgets.dart 未生成");
      }

      if (legacyWidget) {
        check(`${ind} 遗留 widget 文件存在`, true, legacyWidget);
      } else {
        // 遗留文件仅 5 个行业有，允许缺失
        if (["finance", "crm", "fitness", "ecommerce", "education"].includes(ind)) {
          check(`${ind} 遗留 widget 文件存在`, false, `${industry}_widgets.dart 未生成`);
        }
      }

      // 所有找到的 widget 文件
      const widgetFiles = [mustacheWidget, legacyWidget].filter(Boolean);

      if (widgetFiles.length === 0) {
        check(`${ind} 至少一个 widget 文件`, false, "未找到任何 widget 文件");
        continue;
      }

      // 结构检查（每个文件）
      for (const wf of widgetFiles) {
        const label = wf === mustacheWidget ? "Mustache widget" : "遗留 widget";
        const struct = validateFileStructure(wf);

        check(`${ind} ${label} 行数 > 50`, struct.lineCount > 50, `${struct.lineCount} 行`);
        check(`${ind} ${label} 类定义 ≥ 1`, struct.classCount >= 1, `${struct.classCount} 类`);
        check(`${ind} ${label} 包导入有效`, struct.packageImportCount > 0, `${struct.packageImportCount} 个包导入`);
        check(`${ind} ${label} flutter/material Import`, struct.hasFlutterMaterial, true);
      }

      // dart analyze (仅当 flutter SDK 可用)
      if (flutterAvailable) {
        try {
          // 先 flutter pub get 解决依赖
          const pubResult = spawnSync("flutter", ["pub", "get", "--no-precompile"], {
            cwd: appDir,
            stdio: "pipe",
            timeout: 120_000,
            encoding: "utf-8",
          });

          if (pubResult.status !== 0) {
            check(`${ind} flutter pub get`, false, (pubResult.stderr || pubResult.stdout || "").slice(0, 80));
            continue;
          }
          check(`${ind} flutter pub get`, true);

          // dart analyze 各 widget 文件
          for (const wf of widgetFiles) {
            const label = wf === mustacheWidget ? "Mustache widget" : "遗留 widget";
            const relPath = wf.startsWith(appDir) ? wf.slice(appDir.length + 1) : wf;

            const analyzeResult = spawnSync("dart", ["analyze", "--fatal-infos", "--fatal-warnings", relPath], {
              cwd: appDir,
              stdio: "pipe",
              timeout: 180_000,
              encoding: "utf-8",
            });

            const output = (analyzeResult.stdout || "").trim();
            // 解析错误行数
            const errorLines = output
              .split("\n")
              .filter(l => l.includes("error") && l.includes("•"));
            const errors = errorLines.length;

            // dart analyze exit code: 0 = 无问题, 1 = 有 issues
            if (analyzeResult.status === 0 && errors === 0) {
              check(`${ind} ${label} dart analyze`, true, "0 errors");
            } else {
              const shortMsg = errors > 0
                ? `${errors} error(s)`
                : (output.split("\n").filter(l => l).slice(-2).join(" "));
              check(`${ind} ${label} dart analyze`, false, shortMsg);
            }
          }
        } catch (e) {
          check(`${ind} dart analyze 执行`, false, e.message?.slice(0, 80) ?? "异常");
        }
      } else {
        // SDK 不可用时兜底：上述结构检查已覆盖
        skip(`${ind} dart analyze`, "未安装 Flutter SDK（结构检查已通过）");
      }
    } catch (e) {
      check(`${ind} 项目生成`, false, e.message?.slice(0, 80) ?? "生成失败");
    } finally {
      // 清理临时文件
      if (projectDir) {
        try { rmSync(projectDir, { recursive: true, force: true }); } catch {}
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
