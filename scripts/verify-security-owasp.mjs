#!/usr/bin/env node
/**
 * OWASP Top 10 安全扫描
 *
 * 扫描 app-factory 代码库，检查常见 OWASP Top 10 漏洞。
 * 涵盖：A02:2021（加密失效-硬编码密钥）、A03:2021（注入）、A07:2021（认证失效）、
 *       A05:2021（安全配置缺失）、A01:2021（越权访问）
 *
 * 用法: node scripts/verify-security-owasp.mjs
 *       npm run verify:security:owasp
 *
 * 结果说明:
 *   ✓ = 通过 (0 issues)
 *   ✗ = 发现 issues (含文件:行引用)
 *   ⚠ = 跳过 (依赖不存在)
 *
 * 退出码:
 *   0 = 全部通过
 *   1 = 存在 HIGH severity 问题
 *   2 = 扫描过程中出现异常
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..");

// ── 配置 ──────────────────────────────────────────────

const SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  "tmp",
  ".next",
  ".codegraph",
  ".claude",
  "build",
  ".dart_tool",
  "coverage",
]);

const SKIP_PREFIXES = [
  "supabase/migrations",
  "scripts/fonts",
];

const SOURCE_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx", ".dart", ".mjs"];

// ── 扫描规则 ──────────────────────────────────────────

const CHECKS = [
  // ── A02:2021 — 硬编码密钥 ──
  {
    id: "hardcoded-secrets",
    category: "A02:2021 硬编码密钥",
    severity: "HIGH",
    patterns: [
      {
        name: "API 密钥硬编码",
        regex: /api_key\s*=\s*['"][A-Za-z0-9_\-]{16,}['"]/,
      },
      {
        name: "密钥字面量",
        regex: /secret\s*=\s*['"][A-Za-z0-9_\-]{16,}['"]/,
      },
      {
        name: "密码字面量",
        regex: /password\s*=\s*['"][A-Za-z0-9!@#$%^&*()_+\-=\[\]{}|;:',.<>?]{4,}['"]/,
      },
      {
        name: "令牌字面量（非占位符）",
        regex: /token\s*=\s*['"][A-Za-z0-9_\-.]{20,}['"]/,
      },
    ],
  },

  // ── A03:2021 — SQL/NoSQL 注入 ──
  {
    id: "sql-injection",
    category: "A03:2021 SQL 注入",
    severity: "HIGH",
    patterns: [
      {
        name: "execute() 模板字符串注入",
        regex: /\.execute\([^)]*\$\{/,
      },
      {
        name: "query() 模板字符串注入",
        regex: /\.query\([^)]*\$\{/,
      },
      {
        name: "SQL 字符串拼接",
        regex: /['"]\s*\+\s*['"]?(?:SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|WHERE)\s/i,
      },
    ],
  },

  // ── A07:2021 — XSS ──
  {
    id: "xss",
    category: "A07:2021 跨站脚本 (XSS)",
    severity: "HIGH",
    patterns: [
      {
        name: "dangerouslySetInnerHTML (React)",
        regex: /dangerouslySetInnerHTML/,
      },
      {
        name: "innerHTML 赋值",
        regex: /\.innerHTML\s*=/,
      },
      {
        name: "v-html (Vue)",
        regex: /v-html\s*=/,
      },
      {
        name: "Angular bypassSecurityTrust",
        regex: /bypassSecurityTrust(?:Html|Script|Style|Url|ResourceUrl)/,
      },
    ],
  },

  // ── A05:2021 — 安全配置缺失 ──
  {
    id: "missing-csp",
    category: "A05:2021 Content Security Policy",
    severity: "MEDIUM",
    patterns: [
      {
        name: "CSP 头缺失",
        regex: /Content-Security-Policy/,
        invert: true, // 检查是否缺失
        targetFiles: ["middleware.ts"],
      },
    ],
  },

  // ── A01:2021 — 越权/认证绕过 ──
  {
    id: "auth-bypass",
    category: "A01:2021 越权访问 / 认证绕过",
    severity: "HIGH",
    patterns: [
      {
        name: "supabase RLS 策略中 auth.uid() 无 check 子句",
        regex: /auth\.uid\(\)(?![^;]*CHECK\s*\()/i,
        targetFiles: ["supabase/migrations"],
      },
      {
        name: ".select('*') 无行级过滤（可能暴露全部数据）",
        regex: /\.select\(\s*['"]\*['"]\s*\)/,
      },
    ],
  },
];

// ── 帮助函数 ──────────────────────────────────────────

/** 递归收集所有匹配扩展名的源文件 */
function collectSourceFiles(dir, skipSet, skipPrefixes) {
  const results = [];
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return results;
  }

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relativePath = path.relative(REPO_ROOT, fullPath);

    if (skipSet.has(entry.name)) continue;
    if (skipPrefixes.some((p) => relativePath.startsWith(p))) continue;

    if (entry.isDirectory()) {
      results.push(...collectSourceFiles(fullPath, skipSet, skipPrefixes));
    } else if (entry.isFile() && SOURCE_EXTENSIONS.some((ext) => entry.name.endsWith(ext))) {
      results.push({ fullPath, relativePath });
    }
  }

  return results;
}

/** 读取文件内容（安全地处理大文件）*/
function readFileSafe(filePath) {
  try {
    const stat = fs.statSync(filePath);
    if (stat.size > 2 * 1024 * 1024) return null; // 跳过 >2MB 文件
    return fs.readFileSync(filePath, "utf8");
  } catch {
    return null;
  }
}

/** 运行单个模式检查 */
function runPatternCheck(files, pattern) {
  const findings = [];

  for (const file of files) {
    // 文件白名单过滤
    if (pattern.targetFiles) {
      const matchesTarget = pattern.targetFiles.some((t) => file.relativePath.includes(t));
      if (!matchesTarget) continue;
    }

    const content = readFileSafe(file.fullPath);
    if (content === null) continue;

    let match;
    const re = new RegExp(pattern.regex.source, pattern.regex.flags + (pattern.regex.flags.includes("g") ? "" : "g"));
    while ((match = re.exec(content)) !== null) {
      // 跳过注释行中的匹配
      const lineStart = content.lastIndexOf("\n", match.index) + 1;
      const line = content.substring(lineStart, content.indexOf("\n", match.index));
      const trimmedLine = line.trim();
      if (trimmedLine.startsWith("//") || trimmedLine.startsWith("#") || trimmedLine.startsWith("/*") || trimmedLine.startsWith("*")) {
        continue;
      }

      const lineNumber = content.substring(0, match.index).split("\n").length;
      findings.push({ file: file.relativePath, line: lineNumber, match: match[0].substring(0, 80) });
    }
  }

  return findings;
}

// ── 主扫描逻辑 ──────────────────────────────────────────

async function main() {
  console.log("═══════════════════════════════════════════\n");
  console.log("  OWASP Top 10 安全扫描");
  console.log(`  仓库: ${REPO_ROOT}`);
  console.log(`  时间: ${new Date().toISOString()}\n`);
  console.log("═══════════════════════════════════════════\n");

  // 收集源文件
  console.log("收集源文件中...");
  const sourceFiles = collectSourceFiles(REPO_ROOT, SKIP_DIRS, SKIP_PREFIXES);
  console.log(`  共 ${sourceFiles.length} 个源文件\n`);

  let totalHighIssues = 0;
  let totalMediumIssues = 0;
  let totalLowIssues = 0;

  for (const check of CHECKS) {
    const allFindings = [];
    const skippedPatterns = [];

    for (const pattern of check.patterns) {
      if (pattern.invert) {
        // 反向检查：验证目标文件包含该模式
        const targetFiles = sourceFiles.filter((f) =>
          (pattern.targetFiles || []).some((t) => f.relativePath.includes(t))
        );

        if (targetFiles.length === 0) {
          skippedPatterns.push(pattern.name);
          continue;
        }

        let found = false;
        for (const file of targetFiles) {
          const content = readFileSafe(file.fullPath);
          if (content && pattern.regex.test(content)) {
            found = true;
            break;
          }
        }

        if (!found) {
          for (const file of targetFiles) {
            allFindings.push({
              file: file.relativePath,
              line: 1,
              match: `CSP 头未在 ${file.relativePath} 中配置`,
            });
          }
        }
      } else {
        const findings = runPatternCheck(sourceFiles, pattern);
        if (findings.length > 0) {
          allFindings.push(...findings);
        }
      }
    }

    // 输出结果
    const severityLabel = check.severity === "HIGH" ? "[HIGH]" : check.severity === "MEDIUM" ? "[MED]" : "[LOW]";
    const icon = allFindings.length === 0 ? "✓" : "✗";
    const countLabel = allFindings.length > 0 ? ` — ${allFindings.length} 个问题` : "";

    console.log(`${icon} ${severityLabel} ${check.category}${countLabel}`);

    for (const finding of allFindings) {
      console.log(`     ${finding.file}:${finding.line}  — ${finding.match}`);
    }

    if (skippedPatterns.length > 0) {
      console.log(`     ⚠ 跳过: ${skippedPatterns.join(", ")}`);
    }

    if (allFindings.length > 0) {
      const dedupedFiles = new Set(allFindings.map((f) => f.file));
      console.log(`     涉及 ${dedupedFiles.size} 个文件`);
    }

    console.log("");

    if (check.severity === "HIGH") totalHighIssues += allFindings.length;
    else if (check.severity === "MEDIUM") totalMediumIssues += allFindings.length;
    else totalLowIssues += allFindings.length;
  }

  // ── 总结 ──
  console.log("═══════════════════════════════════════════\n");
  console.log("  扫描总结\n");

  if (totalHighIssues === 0 && totalMediumIssues === 0 && totalLowIssues === 0) {
    console.log("  ✓ 全部通过 — 未发现安全问题\n");
  } else {
    if (totalHighIssues > 0) console.log(`  ✗ HIGH   风险: ${totalHighIssues} 个问题（必须修复）`);
    if (totalMediumIssues > 0) console.log(`  ⚠ MEDIUM 风险: ${totalMediumIssues} 个问题（建议修复）`);
    if (totalLowIssues > 0) console.log(`  ℹ LOW    风险: ${totalLowIssues} 个问题（可忽略）`);
    console.log("");
  }

  console.log("═══════════════════════════════════════════\n");

  // 退出码：有 HIGH 则 exit 1
  if (totalHighIssues > 0) {
    console.error("停止: HIGH 风险问题需要先修复。");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("扫描异常:", err);
  process.exit(2);
});
