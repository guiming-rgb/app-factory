#!/usr/bin/env node
/**
 * P1 Widget 模板质量门禁 (B-2 + C-1 子项)
 *
 * 用法: node scripts/verify-widget-quality.mjs
 *
 * 验证 20 个 Mustache 模板文件：
 *   1. ≥ 2 个 class 定义
 *   2. 有效的 Dart import 语句
 *   3. 模板大小 ≥ 1000 字符
 *   4. Mustache 语法有效性（{{ }} 平衡，无未闭合标签）
 * 逐模板 pass/fail 报告
 */

import { readFileSync, readdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const TEMPLATE_DIR = join(
  ROOT,
  "templates",
  "flutter-minimal",
  "lib",
  "core",
  "widgets",
  "industry"
);

let passed = 0;
let failed = 0;

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

// ── Mustache 语法检查 ──────────────────────────────────────────────

/**
 * 检查 Mustache 标签是否平衡
 * - {{xxx}} 必须有一一对应的 {{/xxx}}
 * - {{#xxx}}/{{^xxx}} 等区块必须闭合
 * - 不允许 {{! 以外的未闭合 {{
 */
function validateMustacheSyntax(content, templateName) {
  const issues = [];

  // 1. 检查 {{ }} 平衡（仅检查闭合区块）
  const openSections = [];
  const sectionRe = /\{\{(#|\^|\/)?(\w+)\}\}/g;
  let match;

  while ((match = sectionRe.exec(content)) !== null) {
    const prefix = match[1];
    const tagName = match[2];

    if (prefix === "#" || prefix === "^") {
      openSections.push(tagName);
    } else if (prefix === "/") {
      const lastIdx = openSections.lastIndexOf(tagName);
      if (lastIdx === -1) {
        issues.push(`多余的闭合标签 {{/${tagName}}}（无对应开始）`);
      } else {
        openSections.splice(lastIdx, 1);
      }
    }
  }

  if (openSections.length > 0) {
    issues.push(`未闭合的区块标签: #${openSections.join(", #")}）（需要对应的 {{/${openSections.join("}}}、{{/")}}}）`);
  }

  // 2. 检查孤立 { 或 }（不含 {{ 和 }} 的单个花括号 — 允许 Mustache 的三元 {{{xxx}}})
  //   但 {{{ }}} 必须成对
  const tripleCurlyOpen = (content.match(/\{\{\{/g) || []).length;
  const tripleCurlyClose = (content.match(/\}\}\}/g) || []).length;
  if (tripleCurlyOpen !== tripleCurlyClose) {
    issues.push(
      `三花括号 {{{ }}} 不平衡: ${tripleCurlyOpen} 开启 vs ${tripleCurlyClose} 闭合`
    );
  }

  // 3. 检查变量引用有空标签（{{}} 中间无内容）
  const emptyTagRe = /\{\{\s*\}\}/g;
  if (emptyTagRe.test(content)) {
    issues.push("存在空标签 {{}}");
  }

  // 4. 检查封闭引用是否以 / 开头
  const closeSectionRe = /\{\{\/(\w*)\}\}/g;
  while ((match = closeSectionRe.exec(content)) !== null) {
    if (!match[1]) {
      issues.push(`空闭合标签 {{/}}`);
    }
  }

  return issues;
}

/**
 * 检查 Dart import 语句是否合法
 */
function validateDartImports(content) {
  const issues = [];
  const importRe = /^import\s+['"]([^'"]+)['"]\s*;$/gm;
  let match;

  while ((match = importRe.exec(content)) !== null) {
    const path = match[1];

    // 检查 package: 引用是否非空
    if (path.startsWith("package:") && path.length <= 10) {
      issues.push(`无效的 package import: ${path}`);
    }

    // 检查相对路径是否以 ../ 开头
    if (path.startsWith("../") || path.startsWith("./")) {
      const parts = path.split("/");
      if (parts.length < 2) {
        issues.push(`相对 import 路径过短: ${path}`);
      }
    }
  }

  return issues;
}

/**
 * 统计 Dart class 定义数（排除注释中的 class）
 */
function countClassDefinitions(content) {
  // 移除注释行和字符串中的 class
  const lines = content.split("\n");
  let classCount = 0;
  const classNames = [];

  for (const line of lines) {
    const trimmed = line.trim();
    // 跳过注释行
    if (trimmed.startsWith("//") || trimmed.startsWith("/*") || trimmed.startsWith("*")) continue;
    // 跳过字符串字面量行
    if (trimmed.startsWith('"') || trimmed.startsWith("'")) continue;

    // 匹配 class 定义（排除 abstract class 等，但计入所有 class）
    // 匹配模式: class ClassName extends SomeWidget 或 class ClassName
    const m = trimmed.match(/\bclass\s+(\w+)/);
    if (m && !m[1].startsWith("_")) {
      // 确保这不是方法参数或方法体中的 class
      // Mustache 变量中可能含 class 名称
      const pre = trimmed.slice(0, trimmed.indexOf(m[0]));
      if (!pre.includes("//") && !pre.includes('"') && !pre.includes("'")) {
        classCount++;
        classNames.push(m[1]);
      }
    }
  }

  return { count: classCount, names: classNames };
}

// ── 主流程 ──────────────────────────────────────────────────────────
function main() {
  console.log("══ Widget 模板质量门禁 (B-2 + C-1) ══\n");

  if (!existsSync(TEMPLATE_DIR)) {
    console.error(`❌ 模板目录不存在: ${TEMPLATE_DIR}`);
    process.exit(1);
  }

  const files = readdirSync(TEMPLATE_DIR)
    .filter((f) => f.endsWith(".dart.mustache"))
    .sort();

  console.log(`共 ${files.length} 个 Mustache 模板文件\n`);

  if (files.length < 19) {
    console.error(`❌ 模板文件数不足: 期望 ≥ 20 个（含 generic），实际 ${files.length}`);
    failed++;
  } else {
    check("模板文件数 ≥ 20", files.length >= 20, `${files.length} 文件`);
  }

  for (const file of files) {
    const templateName = file.replace(".dart.mustache", "");
    const fullPath = join(TEMPLATE_DIR, file);
    const content = readFileSync(fullPath, "utf-8");
    const lineCount = content.split("\n").filter((l) => l.trim()).length;

    // ── 检查 1: 大小 ≥ 1000 字符（非 stub） ──
    console.log(`\n── ${templateName} ──`);
    check(
      `${templateName} 模板大小 ≥ 1000`,
      content.length >= 1000,
      `${content.length} 字符, ${lineCount} 有效行`
    );

    // ── 检查 2: class 定义数 ≥ 2 ──
    const { count: classCount, names: classNames } = countClassDefinitions(content);
    check(
      `${templateName} 类定义 ≥ 2`,
      classCount >= 2,
      `${classCount} 个公开类: ${classNames.slice(0, 5).join(", ") || "无"}`
    );

    // ── 检查 3: 有效 Dart import ──
    const hasPackageImport =
      content.includes('import "package:flutter') ||
      content.includes("import 'package:flutter");
    check(
      `${templateName} 有效 Dart import`,
      hasPackageImport,
      hasPackageImport ? "含 package: import" : "无 package import"
    );

    const importIssues = validateDartImports(content);
    if (importIssues.length > 0) {
      check(`${templateName} import 合法性`, false, importIssues.join("; "));
    } else {
      check(`${templateName} import 合法性`, true);
    }

    // ── 检查 4: Mustache 语法有效性 ──
    const syntaxIssues = validateMustacheSyntax(content, templateName);
    if (syntaxIssues.length > 0) {
      for (const issue of syntaxIssues) {
        check(`${templateName} Mustache 语法: ${issue}`, false);
      }
    } else {
      check(`${templateName} Mustache 语法平衡`, true, "{{ }} 区块闭合正常");
    }
  }

  // ── 最终报告 ──
  console.log(`\n══ 结果: ${passed} 通过 / ${failed} 失败 ══`);
  if (failed > 0) process.exit(1);
}

main();
