#!/usr/bin/env node
/**
 * prepare-app-store-submission.mjs — 为应用商店提交流程准备所有素材
 *
 * 该脚本内部调用 generate-app-icons.mjs 和 generate-store-screenshots.mjs，
 * 并根据目标商店生成额外所需文件（ExportOptions.plist、隐私政策、EULA 等）。
 *
 * 用法:
 *   node scripts/prepare-app-store-submission.mjs \
 *       --project ./tmp/generated-app \
 *       --store ios \
 *       --name "MyApp" \
 *       --color "#4F46E5"
 *
 * 参数:
 *   --project, -p  生成的 Flutter 项目路径（必填）
 *   --store, -s    目标商店: ios | android | wechat（必填）
 *   --name, -n     App 显示名称（必填）
 *   --desc, -d     App 描述（可选，默认 "A powerful app built with App Factory"）
 *   --color, -c    主色调（可选，默认 #4F46E5）
 *   --out, -o      输出目录（可选，默认 <project>/store-assets）
 *   --help, -h     显示帮助
 *
 * 输出:
 *   <project>/store-assets/
 *     icons/                 各平台图标
 *     screenshots/           商店截屏
 *     privacy-policy.md      隐私政策模板
 *     eula.md                EULA 模板
 *     app-description.md     App 描述文案
 *     keywords.md            关键词
 *     ExportOptions.plist    iOS 导出的 ExportOptions（仅 iOS）
 *     feature-graphic.png    1024×500 功能图（仅 Android）
 *     debug.keystore         调试密钥库（仅 Android，按需创建）
 *     submission-checklist.md  提交流程核对清单
 */

import fs from "fs";
import path from "path";
import { execSync } from "child_process";

// ── 工具函数 ────────────────────────────────────────

function parseArgs() {
  const args = process.argv.slice(2);
  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    printHelp();
    process.exit(0);
  }

  const opts = {
    project: null,
    store: null,
    name: "App",
    desc: "A powerful app built with App Factory",
    color: "#4F46E5",
    out: null,
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--project":
      case "-p":
        opts.project = args[++i];
        break;
      case "--store":
      case "-s":
        opts.store = args[++i];
        break;
      case "--name":
      case "-n":
        opts.name = args[++i] || "App";
        break;
      case "--desc":
      case "-d":
        opts.desc = args[++i] || "A powerful app built with App Factory";
        break;
      case "--color":
      case "-c":
        opts.color = args[++i] || "#4F46E5";
        break;
      case "--out":
      case "-o":
        opts.out = args[++i];
        break;
      default:
        if (args[i].startsWith("-")) {
          console.error(`未知参数: ${args[i]}`);
          process.exit(1);
        }
    }
  }

  if (!opts.project) {
    console.error("错误: --project 是必填参数");
    process.exit(1);
  }

  if (!opts.store) {
    console.error("错误: --store 是必填参数 (ios / android / wechat)");
    process.exit(1);
  }

  const validStores = ["ios", "android", "wechat"];
  if (!validStores.includes(opts.store)) {
    console.error(`错误: 不支持的商店 "${opts.store}"，可选: ${validStores.join(", ")}`);
    process.exit(1);
  }

  if (!opts.out) {
    opts.out = path.join(opts.project, "store-assets");
  }

  return opts;
}

function printHelp() {
  console.log(`
使用方法: node scripts/prepare-app-store-submission.mjs [选项]

选项:
  --project, -p  生成的 Flutter 项目路径（必填）
  --store, -s    目标商店: ios | android | wechat（必填）
  --name, -n     App 显示名称（必填）
  --desc, -d     App 描述（可选）
  --color, -c    主色调（可选，默认 #4F46E5）
  --out, -o      输出目录（可选，默认 <project>/store-assets）
  --help, -h     显示本帮助

示例:
  node scripts/prepare-app-store-submission.mjs --project ./tmp/generated-app --store ios --name "记账本"
  node scripts/prepare-app-store-submission.mjs -p ./tmp/generated-app -s android -n "MyApp" -c "#6366F1"
`);
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function writeFile(filePath, content) {
  fs.writeFileSync(filePath, content, "utf8");
  const sizeKB = (Buffer.byteLength(content, "utf8") / 1024).toFixed(1);
  console.log(`  ✓ ${path.basename(filePath)}  (${sizeKB} KB)`);
}

/** 运行一个 Node 脚本并返回 stdout */
function runScript(scriptPath, args) {
  const cmd = `node "${scriptPath}" ${args}`;
  console.log(`\n  执行: node ${path.basename(scriptPath)} ${args}`);
  const output = execSync(cmd, { encoding: "utf8", stdio: ["inherit", "pipe", "pipe"] });
  // 打印脚本的输出（缩进）
  for (const line of output.split("\n").filter(Boolean)) {
    console.log(`    ${line}`);
  }
}

// ── 文件内容生成 ────────────────────────────────────

function generatePrivacyPolicy(appName) {
  return `# ${appName} — 隐私政策

生效日期：${new Date().toISOString().split("T")[0]}

## 1. 信息收集
本应用不会收集您的个人身份信息，除非您主动提供。我们可能收集以下信息：
- 设备信息（设备型号、操作系统版本）
- 应用使用数据（崩溃日志、性能数据）

## 2. 信息使用
收集的信息仅用于：
- 改进应用性能和用户体验
- 提供技术支持和故障排查
- 遵守法律法规要求

## 3. 数据存储与安全
我们采用行业标准的安全措施保护您的数据。所有数据传输使用加密通道。

## 4. 第三方服务
本应用可能使用以下第三方服务：
- Apple App Store / Google Play 分发服务
- 推送通知服务（如有）

## 5. 用户权利
您有权：
- 访问和修改您的个人信息
- 删除您的账户和数据
- 撤回同意

## 6. 联系我们
如有隐私相关问题，请联系：privacy@${appName.toLowerCase().replace(/[^a-z0-9]/g, "")}.com

## 7. 更新
本隐私政策可能不定期更新。更新后继续使用即表示同意修订后的条款。
`;
}

function generateEULA(appName) {
  return `# ${appName} — 最终用户许可协议 (EULA)

最后更新：${new Date().toISOString().split("T")[0]}

## 1. 许可授予
本许可协议（"协议"）是您（"用户"）与 ${appName} 开发者之间的法律协议。
根据本协议条款，开发者授予您非独占、不可转让的许可，在兼容设备上安装和使用本应用。

## 2. 使用限制
用户同意不：
- 逆向工程、反编译或反汇编本应用
- 修改、改编或创建衍生作品
- 删除或修改任何版权标识
- 用于任何非法或未经授权的目的

## 3. 知识产权
本应用及其所有内容、功能和设计均受版权法和其他知识产权法律保护。

## 4. 免责声明
本应用按"现状"提供，不提供任何明示或暗示的保证。
开发者不保证本应用无错误或不间断运行。

## 5. 责任限制
在法律允许的最大范围内，开发者不对因使用或无法使用本应用而产生的任何间接、偶然、特殊或后果性损害承担责任。

## 6. 终止
违反本协议条款将自动终止本许可。

## 7. 适用法律
本协议受适用法律管辖。
`;
}

function generateAppDescription(appName, desc) {
  return `# ${appName} — App Store 描述文案

## 标题
${appName}

## 副标题
${desc}

## 描述
${appName} 是一款由 App Factory 生成的强大应用。

${desc}

核心功能：
- 直观的用户界面设计
- 流畅的多平台体验
- 安全的数据管理
- 实时同步与更新

## 版本亮点
- 首次发布
- 包含所有核心功能
`;
}

function generateKeywords(appName) {
  return `# ${appName} — App Store 关键词

${appName.toLowerCase().replace(/[^a-z0-9,\s]/g, "")},app,mobile,productivity,tool,utility
`;
}

function generateExportOptionsPlist() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>method</key>
    <string>ad-hoc</string>
    <key>signingStyle</key>
    <string>manual</string>
    <key>stripSwiftSymbols</key>
    <true/>
    <key>destination</key>
    <string>export</string>
    <key>uploadBitcode</key>
    <false/>
    <key>uploadSymbols</key>
    <true/>
    <key>compileBitcode</key>
    <false/>
    <key>generateAppStoreInformation</key>
    <false/>
    <key>provisioningProfiles</key>
    <dict/>
</dict>
</plist>
`;
}

function generateAndroidKeystoreScript(keystorePath) {
  // 仅生成 debug keystore，不覆盖已有文件
  if (fs.existsSync(keystorePath)) {
    console.log("     ⚠ debug.keystore 已存在，跳过生成");
    return;
  }
  try {
    execSync(
      `keytool -genkey -v -keystore "${keystorePath}" -alias androiddebugkey ` +
        `-keyalg RSA -keysize 2048 -validity 10000 ` +
        `-storepass android -keypass android ` +
        `-dname "CN=Android Debug, OU=Development, O=Unknown, L=Unknown, ST=Unknown, C=US"`,
      { stdio: ["ignore", "pipe", "pipe"] },
    );
    console.log("  ✓ debug.keystore created");
  } catch {
    console.log("     ⚠ keytool 不可用，请手动生成 debug.keystore");
  }
}

function generateFeatureGraphic(appName, color, outPath) {
  // 用 sharp 生成简单的功能图
  const svg = `
    <svg width="1024" height="500" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="fg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${color}" stop-opacity="0.85"/>
          <stop offset="100%" stop-color="${color}" stop-opacity="0.6"/>
        </linearGradient>
      </defs>
      <rect width="1024" height="500" fill="url(#fg)"/>
      <text x="512" y="230" font-family="sans-serif" font-size="64" font-weight="bold" fill="white" text-anchor="middle">${appName}</text>
      <text x="512" y="290" font-family="sans-serif" font-size="28" fill="rgba(255,255,255,0.8)" text-anchor="middle">${appName}</text>
    </svg>`;

  import("sharp").then((sharp) => {
    sharp.default(Buffer.from(svg)).png().toFile(outPath);
    console.log(`  ✓ feature-graphic.png  (1024×500)`);
  });
}

// ── 生成提交核对清单 ────────────────────────────────

function generateChecklist(appName, store, opts) {
  const commonItems = [
    "[x] App 名称已确认",
    "[x] App 图标已生成（所有尺寸）",
    "[x] 商店截屏已生成",
    "[x] App 描述文案已准备",
    "[ ] 隐私政策链接已配置",
    "[ ] EULA 已确认",
    "[ ] 版本号与 Build 号已设置",
    "[ ] 代码签名证书已配置",
    "[ ] 测试已全部通过",
  ];

  const platformItems = {
    ios: [
      "[x] iOS 图标已生成（180×180、120×120、80×80、57×57、40×40、29×29、20×20）",
      "[ ] App Store Connect 条目已创建",
      "[ ] iOS 证书与 Provisioning Profile 已配置",
      "[ ] ExportOptions.plist 已生成",
      "[ ] IDFA 声明（如需）",
      "[ ] 内购项目已配置（如需）",
    ],
    android: [
      "[x] Android 图标已生成（mdpi/hdpi/xhdpi/xxhdpi/xxxhdpi）",
      "[x] 功能图 (feature-graphic) 已生成 (1024×500)",
      "[ ] Google Play Console 条目已创建",
      "[ ] 商店列表信息已填写",
      "[ ] Android 签名密钥已配置",
      "[ ] 隐私政策已上传",
      "[ ] 内容分级已填写",
    ],
    wechat: [
      "[x] 微信图标已生成（144×144、96×96、48×48）",
      "[ ] 微信小程序 AppID 已确认",
      "[ ] 服务类目已选择",
      "[ ] 开发版本已上传",
      "[ ] 体验版已验证",
      "[ ] 提交审核",
    ],
  };

  const lines = [
    `# ${appName} — ${store.toUpperCase()} 提交核对清单`,
    "",
    `生成时间: ${new Date().toISOString()}`,
    `项目路径: ${opts.project}`,
    `商店: ${store}`,
    "",
    "---",
    "",
    "## 通用项",
    ...commonItems.map((i) => `- ${i}`),
    "",
    `## ${store === "ios" ? "iOS" : store === "android" ? "Android" : "微信"} 特有项`,
    ...platformItems[store].map((i) => `- ${i}`),
    "",
    "## 提交前确认",
    "- [ ] 所有截屏内容真实反映 App 功能",
    "- [ ] App 名称与商店列表名称一致",
    "- [ ] 版本号与代码中一致",
    "- [ ] 隐私政策链接有效",
    "- [ ] 英文/本地化文案无拼写错误",
    "",
    "---",
    "",
    "_此文件由 prepare-app-store-submission.mjs 自动生成_",
  ];

  return lines.join("\n");
}

// ── 主流程 ──────────────────────────────────────────

async function main() {
  const opts = parseArgs();
  const start = Date.now();
  const storeAssetsDir = path.resolve(opts.out);
  const iconsDir = path.join(storeAssetsDir, "icons");
  const screenshotsDir = path.join(storeAssetsDir, "screenshots");

  ensureDir(storeAssetsDir);
  ensureDir(iconsDir);
  ensureDir(screenshotsDir);

  const scriptsDir = path.resolve(
    path.dirname(new URL(import.meta.url).pathname),
  );

  console.log("══ 准备 App Store 提交素材 ══\n");
  console.log(`  App:       ${opts.name}`);
  console.log(`  商店:      ${opts.store}`);
  console.log(`  项目:      ${opts.project}`);
  console.log(`  输出:      ${storeAssetsDir}\n`);

  // ── 1. 生成图标 ──────────────────────────────────
  console.log("── 1/5 生成 App 图标 ──");
  const iconScript = path.join(scriptsDir, "generate-app-icons.mjs");
  const iconArgs = [
    `--name "${opts.name}"`,
    `--color "${opts.color}"`,
    `--out "${storeAssetsDir}"`,
  ].join(" ");
  runScript(iconScript, iconArgs);

  // ── 2. 生成截屏 ──────────────────────────────────
  console.log("\n── 2/5 生成商店截屏 ──");
  const screenshotScript = path.join(scriptsDir, "generate-store-screenshots.mjs");
  let screenshotStoreFlag = "";
  if (opts.store === "ios") {
    // 完整输出所有尺寸（6.7" + 6.5" + 5.5"）
    screenshotStoreFlag = "";
  } else if (opts.store === "android") {
    // Android 只需要 1080×1920
    screenshotStoreFlag = "";
  }
  const screenshotArgs = [
    `--name "${opts.name}"`,
    `--desc "${opts.desc}"`,
    `--color "${opts.color}"`,
    `--out "${storeAssetsDir}"`,
  ].join(" ");
  runScript(screenshotScript, screenshotArgs);

  // ── 3. 生成文案与法律文件 ──────────────────────────
  console.log("\n── 3/5 生成文案与法律文件 ──");
  const docsDir = path.join(storeAssetsDir, "docs");
  ensureDir(docsDir);

  writeFile(path.join(docsDir, "privacy-policy.md"), generatePrivacyPolicy(opts.name));
  writeFile(path.join(docsDir, "eula.md"), generateEULA(opts.name));
  writeFile(path.join(docsDir, "app-description.md"), generateAppDescription(opts.name, opts.desc));
  writeFile(path.join(docsDir, "keywords.md"), generateKeywords(opts.name));

  // ── 4. 平台专属文件 ──────────────────────────────
  console.log("\n── 4/5 平台专属文件 ──");

  if (opts.store === "ios") {
    // ExportOptions.plist
    const plistPath = path.join(storeAssetsDir, "ExportOptions.plist");
    writeFile(plistPath, generateExportOptionsPlist());

    // iOS 额外需生成 6.5" 和 5.5" 截屏 (已在上一步生成所有尺寸)
    console.log("     ✓ iOS 专属文件就绪");
  } else if (opts.store === "android") {
    // Feature graphic
    const graphicPath = path.join(storeAssetsDir, "feature-graphic.png");
    try {
      const sharp = (await import("sharp")).default;
      const svg = `
        <svg width="1024" height="500" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="fg" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stop-color="${opts.color}" stop-opacity="0.85"/>
              <stop offset="100%" stop-color="${opts.color}" stop-opacity="0.6"/>
            </linearGradient>
          </defs>
          <rect width="1024" height="500" fill="url(#fg)"/>
          <rect x="362" y="100" width="300" height="300" rx="60" fill="rgba(255,255,255,0.15)"/>
          <text x="512" y="270" font-family="sans-serif" font-size="72" font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="central">${opts.name.charAt(0).toUpperCase()}</text>
          <text x="512" y="370" font-family="sans-serif" font-size="28" fill="rgba(255,255,255,0.8)" text-anchor="middle">${opts.desc}</text>
        </svg>`;
      await sharp(Buffer.from(svg)).png().toFile(graphicPath);
      const kb = (fs.statSync(graphicPath).size / 1024).toFixed(1);
      console.log(`  ✓ feature-graphic.png  (1024×500, ${kb} KB)`);
    } catch {
      console.log("     ⚠ feature-graphic 生成失败（sharp 错误），继续执行");
    }

    // Debug keystore
    const keystorePath = path.join(storeAssetsDir, "debug.keystore");
    generateAndroidKeystoreScript(keystorePath);
  } else if (opts.store === "wechat") {
    console.log("     ✓ 微信图标已生成（在 icons/wechat/ 中）");
    console.log("     ✓ 请确认以下信息：");
    console.log("       - 小程序 AppID 配置");
    console.log("       - 服务类目选择");
    console.log("       - 开发版本上传");
  }

  // ── 5. 提交清单 ──────────────────────────────────
  console.log("\n── 5/5 生成提交核对清单 ──");
  const checklistPath = path.join(storeAssetsDir, "submission-checklist.md");
  writeFile(checklistPath, generateChecklist(opts.name, opts.store, opts));

  // ── 汇总 ──────────────────────────────────────────
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  const fileCount = fs.readdirSync(storeAssetsDir, { recursive: true }).filter((f) => fs.statSync(path.join(storeAssetsDir, f)).isFile()).length;

  console.log(`\n═══════════════════════════════════════════`);
  console.log(`✅ 完成：为 "${opts.name}" (${opts.store}) 生成了 ${fileCount} 个文件`);
  console.log(`   耗时: ${elapsed}s`);
  console.log(`   输出: ${storeAssetsDir}/`);
  console.log(`   清单: ${checklistPath}`);
  console.log(`═══════════════════════════════════════════\n`);

  // 输出最终提示
  if (opts.store === "ios") {
    console.log("下一步:");
    console.log(`  1. 查看 ${path.join(docsDir, "submission-checklist.md")}`);
    console.log("  2. 在 App Store Connect 创建 App 条目");
    console.log("  3. 配置证书和 Provisioning Profile");
    console.log("  4. 使用 Xcode Archive 或 fastlane 构建并上传\n");
  } else if (opts.store === "android") {
    console.log("下一步:");
    console.log(`  1. 查看 ${path.join(docsDir, "submission-checklist.md")}`);
    console.log("  2. 在 Google Play Console 创建 App 条目");
    console.log("  3. 配置签名密钥");
    console.log("  4. 使用 flutter build appbundle 构建 AAB\n");
  } else if (opts.store === "wechat") {
    console.log("下一步:");
    console.log(`  1. 查看 ${path.join(docsDir, "submission-checklist.md")}`);
    console.log("  2. 在微信公众平台配置小程序");
    console.log("  3. 上传代码并提交审核\n");
  }
}

main().catch((err) => {
  console.error(`\n❌ 运行时错误:`, err.message);
  process.exit(1);
});
