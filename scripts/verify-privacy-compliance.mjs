#!/usr/bin/env node
/**
 * 隐私合规检查
 *
 * 验证 app-factory 的生成应用模板满足隐私合规要求：
 * - 隐私弹窗组件存在于所有三个模板目录中
 * - /privacy 和 /terms 页面存在于 Next.js 应用中
 * - 扫描模板中数据收集模式并标记
 * - 每个模板包含隐私政策引用/占位符
 *
 * 用法: node scripts/verify-privacy-compliance.mjs
 *       npm run verify:privacy:compliance
 *
 * 退出码:
 *   0 = 全部通过
 *   1 = 存在缺失项
 *   2 = 扫描异常
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..");

// ── 配置 ──────────────────────────────────────────────

const TEMPLATE_BASE = path.join(REPO_ROOT, "templates");

/** 需检查的模板平台及其路径标识 */
const PLATFORM_TEMPLATES = [
  {
    name: "Flutter",
    dir: "flutter-minimal",
    privacyPopups: [
      "lib/features/privacy/presentation/privacy_page.dart",
    ],
    privacyPopupKeywordFiles: [
      "lib/features/privacy",
      "lib/pages/privacy",
    ],
  },
  {
    name: "WeChat Mini Program",
    dir: "wechat-miniprogram-minimal",
    privacyPopups: [
      "components/privacy-popup/privacy-popup.wxml",
      "components/privacy-popup/privacy-popup.js",
    ],
    privacyPopupKeywordFiles: [
      "privacy-popup",
      "privacy",
    ],
  },
  {
    name: "Harmony",
    dir: "harmony-minimal",
    privacyPopups: [
      // Harmony 模板可能使用不同命名
    ],
    privacyPopupKeywordFiles: [
      "privacy",
      "Privacy",
    ],
  },
];

/** 待扫描的数据收集模式 */
const DATA_COLLECTION_PATTERNS = [
  {
    name: "Supabase 数据收集",
    regex: /supabase\.from\(/,
    severity: "INFO",
    note: "标准后端数据存储 — 需在隐私政策中声明",
  },
  {
    name: "Analytics 追踪",
    regex: /\b(?:analytics|Amplitude|Mixpanel|Segment|ga\b|gtag)\./i,
    severity: "MEDIUM",
    note: "第三方分析追踪 — 需用户同意",
  },
  {
    name: "Firebase SDK",
    regex: /firebase\./i,
    severity: "MEDIUM",
    note: "第三方 Firebase SDK — 需在隐私政策中声明",
  },
  {
    name: "地理位置收集",
    regex: /geolocat(?:ion|or)\b/i,
    severity: "MEDIUM",
    note: "地理位置数据 — 需明确用户同意",
  },
  {
    name: "联系人/通讯录访问",
    regex: /contacts?\b/i,
    severity: "HIGH",
    note: "联系人访问 — 应仅在必要时请求权限",
  },
  {
    name: "相机/麦克风访问",
    regex: /camera|microphone|MediaDevice/i,
    severity: "MEDIUM",
    note: "传感器访问 — 需权限请求和隐私声明",
  },
  {
    name: "本地存储/Cookie",
    regex: /localStorage|sessionStorage|cookie|AsyncStorage|SharedPreferences/i,
    severity: "INFO",
    note: "客户端存储 — 标准行为",
  },
];

// ── 帮助函数 ──────────────────────────────────────────

/** 收集模板目录中文件时跳过的目录名 */
const SKIP_TEMPLATE_DIRS = new Set([
  "node_modules",
  "build",
  ".dart_tool",
  "coverage",
  "ios",       // Xcode 生成
  "android",   // Gradle 生成
  "macos",     // macOS 生成
  "windows",   // Windows 生成
  "linux",     // Linux 生成
  ".symlinks",
  "assets/fonts",  // 字体文件含无关二进制数据
]);

/** 跳过的文件扩展名 */
const SKIP_TEMPLATE_EXTS = new Set([
  ".otf",
  ".ttf",
  ".woff",
  ".woff2",
  ".eot",
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".svg",
  ".ico",
  ".webp",
  ".mp4",
  ".mp3",
  ".zip",
  ".gz",
]);

/** 递归收集模板目录中所有源文件 */
function collectTemplateFiles(templateDir) {
  const results = [];
  const dirPath = path.join(TEMPLATE_BASE, templateDir);
  if (!fs.existsSync(dirPath)) return results;

  function walk(dir) {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relPath = path.relative(dirPath, fullPath);
      const pathSegments = relPath.split("/");

      // 跳过黑名单目录
      if (entry.isDirectory()) {
        const shouldSkip = SKIP_TEMPLATE_DIRS.has(entry.name) ||
          SKIP_TEMPLATE_DIRS.has(pathSegments.slice(-2).join("/"));
        if (shouldSkip) continue;
        if (!entry.name.startsWith(".") && entry.name !== "node_modules") {
          walk(fullPath);
        }
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (SKIP_TEMPLATE_EXTS.has(ext)) continue;
        results.push({ fullPath, relativePath: relPath });
      }
    }
  }

  walk(dirPath);
  return results;
}

/** 检查特定路径是否存在 */
function pathExists(...segments) {
  const fullPath = path.join(...segments);
  return fs.existsSync(fullPath);
}

/** 读取文件内容 */
function readFileSafe(filePath) {
  try {
    const stat = fs.statSync(filePath);
    if (stat.size > 2 * 1024 * 1024) return null;
    return fs.readFileSync(filePath, "utf8");
  } catch {
    return null;
  }
}

// ── 检查函数 ──────────────────────────────────────────

function checkPrivacyPages() {
  console.log("\n── Next.js 隐私/条款页面 ──\n");

  const checks = [
    { name: "/privacy/page.tsx", path: ["app", "privacy", "page.tsx"] },
    { name: "/terms/page.tsx", path: ["app", "terms", "page.tsx"] },
    { name: "/privacy/page.mdx", path: ["app", "privacy", "page.mdx"] },
    { name: "/terms/page.mdx", path: ["app", "terms", "page.mdx"] },
  ];

  let foundPrivacy = false;
  let foundTerms = false;

  for (const check of checks) {
    const exists = pathExists(REPO_ROOT, ...check.path);
    if (exists) {
      if (check.name.startsWith("/privacy")) foundPrivacy = true;
      if (check.name.startsWith("/terms")) foundTerms = true;
      console.log(`  ✓ ${check.name}`);
    }
  }

  if (!foundPrivacy) console.log("  ✗ 隐私政策页缺失（app/privacy/page.tsx 或 .mdx）");
  if (!foundTerms) console.log("  ✗ 服务条款页缺失（app/terms/page.tsx 或 .mdx）");

  return { privacy: foundPrivacy, terms: foundTerms };
}

function checkTemplatePrivacyPopups() {
  console.log("\n── 模板隐私弹窗 ──\n");

  const results = [];

  for (const platform of PLATFORM_TEMPLATES) {
    const templateDir = path.join(TEMPLATE_BASE, platform.dir);
    if (!fs.existsSync(templateDir)) {
      console.log(`  ⚠ ${platform.name}: 模板目录不存在 (${platform.dir})`);
      results.push({ platform: platform.name, hasPopup: false, missing: ["模板目录"] });
      continue;
    }

    const missingPopup = [];

    // 检查明确的隐私弹窗路径
    for (const popupPath of platform.privacyPopups) {
      if (!pathExists(templateDir, popupPath)) {
        missingPopup.push(popupPath);
      }
    }

    // 如果明确的路径不存在，按关键字搜索
    if (missingPopup.length === platform.privacyPopups.length && platform.privacyPopups.length > 0) {
      const files = collectTemplateFiles(platform.dir);
      const keywordHits = files.filter((f) =>
        platform.privacyPopupKeywordFiles.some((kw) => f.relativePath.toLowerCase().includes(kw.toLowerCase()))
      );

      if (keywordHits.length > 0) {
        console.log(`  ✓ ${platform.name}: 通过关键字找到 ${keywordHits.length} 个隐私相关文件`);
        for (const hit of keywordHits.slice(0, 5)) {
          console.log(`      ${hit.relativePath}`);
        }
        results.push({ platform: platform.name, hasPopup: true, missing: [] });
        continue;
      }
    }

    if (missingPopup.length === 0) {
      console.log(`  ✓ ${platform.name}: 隐私弹窗组件已就绪`);
      results.push({ platform: platform.name, hasPopup: true, missing: [] });
    } else {
      console.log(`  ✗ ${platform.name}: 隐私弹窗缺失`);
      for (const m of missingPopup) {
        console.log(`      缺少: ${m}`);
      }
      results.push({ platform: platform.name, hasPopup: false, missing: missingPopup });
    }
  }

  return results;
}

function checkDataCollectionPatterns() {
  console.log("\n── 数据收集模式扫描 ──\n");

  let totalFindings = 0;

  for (const platform of PLATFORM_TEMPLATES) {
    const templateDir = path.join(TEMPLATE_BASE, platform.dir);
    if (!fs.existsSync(templateDir)) continue;

    console.log(`  [${platform.name}]`);

    const files = collectTemplateFiles(platform.dir);
    const platformFindings = [];

    for (const pattern of DATA_COLLECTION_PATTERNS) {
      for (const file of files) {
        const content = readFileSafe(file.fullPath);
        if (!content) continue;

        const re = new RegExp(pattern.regex.source, pattern.regex.flags + "g");
        let match;
        while ((match = re.exec(content)) !== null) {
          const lineNumber = content.substring(0, match.index).split("\n").length;
          platformFindings.push({
            file: file.relativePath,
            line: lineNumber,
            pattern: pattern.name,
            severity: pattern.severity,
            note: pattern.note,
          });
        }
      }
    }

    if (platformFindings.length === 0) {
      console.log(`      ℹ 未检测到明确的数据收集调用`);
    } else {
      for (const finding of platformFindings) {
        const icon = finding.severity === "HIGH" ? "✗" : finding.severity === "MEDIUM" ? "⚠" : "ℹ";
        console.log(`      ${icon} ${finding.pattern}: ${finding.file}:${finding.line}`);
        console.log(`          ${finding.note}`);
        totalFindings++;
      }
    }
    console.log("");
  }

  return totalFindings;
}

function checkPrivacyPolicyReferences() {
  console.log("\n── 隐私政策引用/占位符 ──\n");

  const PRIVACY_KEYWORDS = [
    /隐私政策|隐私|privacy.?policy|privacy.?notice|GDPR|CCPA|个人信息|personal.?data/i,
    /数据保护|data.?protection|信息收集|information.?collect/i,
  ];

  let allHaveReference = true;

  for (const platform of PLATFORM_TEMPLATES) {
    const templateDir = path.join(TEMPLATE_BASE, platform.dir);
    if (!fs.existsSync(templateDir)) {
      console.log(`  ⚠ ${platform.name}: 模板目录不存在`);
      continue;
    }

    const files = collectTemplateFiles(platform.dir);
    let foundReference = false;

    for (const file of files) {
      const content = readFileSafe(file.fullPath);
      if (!content) continue;

      for (const kw of PRIVACY_KEYWORDS) {
        if (kw.test(content)) {
          foundReference = true;
          break;
        }
      }
      if (foundReference) break;
    }

    if (foundReference) {
      console.log(`  ✓ ${platform.name}: 含隐私政策引用`);
    } else {
      console.log(`  ✗ ${platform.name}: 无隐私政策引用 — 需要添加隐私政策占位符`);
      allHaveReference = false;
    }
  }

  return allHaveReference;
}

// ── 主函数 ──────────────────────────────────────────

function main() {
  console.log("═══════════════════════════════════════════\n");
  console.log("  隐私合规检查");
  console.log(`  时间: ${new Date().toISOString()}\n`);
  console.log("═══════════════════════════════════════════\n");

  const results = {
    privacyPages: null,
    templatePopups: [],
    dataCollectionFindings: 0,
    privacyReferences: false,
    errors: [],
  };

  // 1. 检查隐私和条款页面
  results.privacyPages = checkPrivacyPages();

  // 2. 检查模板中的隐私弹窗
  results.templatePopups = checkTemplatePrivacyPopups();

  // 3. 扫描数据收集模式
  results.dataCollectionFindings = checkDataCollectionPatterns();

  // 4. 检查隐私政策引用
  results.privacyReferences = checkPrivacyPolicyReferences();

  // ── 总结 ──
  console.log("\n═══════════════════════════════════════════\n");
  console.log("  合规检查总结\n");

  let failed = false;

  if (results.privacyPages.privacy && results.privacyPages.terms) {
    console.log("  ✓ 隐私/条款页面已存在");
  } else {
    if (!results.privacyPages.privacy) console.log("  ✗ 缺失: 隐私政策页");
    if (!results.privacyPages.terms) console.log("  ✗ 缺失: 服务条款页");
    failed = true;
  }

  const popupsMissing = results.templatePopups.filter((r) => !r.hasPopup);
  if (popupsMissing.length === 0) {
    console.log("  ✓ 所有模板均已配置隐私弹窗");
  } else {
    for (const p of popupsMissing) {
      console.log(`  ✗ ${p.platform}: 隐私弹窗缺失`);
    }
    failed = true;
  }

  if (results.dataCollectionFindings > 0) {
    console.log(`  ℹ 发现 ${results.dataCollectionFindings} 处数据收集调用 — 需在隐私政策中声明`);
  } else {
    console.log("  ✓ 未检测到数据收集调用");
  }

  if (results.privacyReferences) {
    console.log("  ✓ 各模板已包含隐私政策引用");
  } else {
    console.log("  ✗ 部分模板缺少隐私政策引用");
    failed = true;
  }

  console.log("\n═══════════════════════════════════════════\n");

  if (failed) {
    console.error("停止: 存在需要修复的隐私合规问题。");
    process.exit(1);
  }

  console.log("✓ 全部隐私合规检查通过\n");
}

main().catch((err) => {
  console.error("扫描异常:", err);
  process.exit(2);
});
