#!/usr/bin/env node
/**
 * generate-app-icons.mjs — 从 1024×1024 源 PNG 生成各平台所有要求的图标尺寸
 *
 * 用法:
 *   node scripts/generate-app-icons.mjs \
 *       --source icon.png \
 *       --name "MyApp" \
 *       --color "#4F46E5" \
 *       --out ./store-assets
 *
 * 参数:
 *   --source, -s   1024×1024 PNG 源文件路径（可选。不提供则生成纯色占位图标）
 *   --name, -n     App 显示名称（必填，用于纯色占位图标中的文字）
 *   --color, -c    主色调（可选，默认 #4F46E5，支持 #RGB / #RRGGBB / #RRGGBBAA）
 *   --out, -o      输出目录（可选，默认 ./store-assets）
 *   --help, -h     显示帮助
 *
 * 输出结构:
 *   <out>/icons/ios/      — 所有 iOS 尺寸
 *   <out>/icons/android/  — 所有 Android 尺寸
 *   <out>/icons/wechat/   — 所有微信尺寸
 *
 * 依赖:
 *   sharp（已在 devDependencies 中）
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// ── 配置 ────────────────────────────────────────────
const IOS_SIZES = [
  { name: "Icon-180@3x.png", size: 180 },
  { name: "Icon-120@2x.png", size: 120 },
  { name: "Icon-80@2x.png", size: 80 },
  { name: "Icon-57.png", size: 57 },
  { name: "Icon-40@2x.png", size: 80 },
  { name: "Icon-29.png", size: 29 },
  { name: "Icon-20.png", size: 20 },
];

const ANDROID_SIZES = [
  { name: "ic_launcher_mdpi.png", size: 48 },
  { name: "ic_launcher_hdpi.png", size: 72 },
  { name: "ic_launcher_xhdpi.png", size: 96 },
  { name: "ic_launcher_xxhdpi.png", size: 144 },
  { name: "ic_launcher_xxxhdpi.png", size: 192 },
];

const WECHAT_SIZES = [
  { name: "icon_144.png", size: 144 },
  { name: "icon_96.png", size: 96 },
  { name: "icon_48.png", size: 48 },
];

// ── 工具函数 ────────────────────────────────────────

/** 解析命令行参数 */
function parseArgs() {
  const args = process.argv.slice(2);
  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    printHelp();
    process.exit(0);
  }

  const opts = { source: null, name: "App", color: "#4F46E5", out: "store-assets" };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--source":
      case "-s":
        opts.source = args[++i] || null;
        break;
      case "--name":
      case "-n":
        opts.name = args[++i] || "App";
        break;
      case "--color":
      case "-c":
        opts.color = args[++i] || "#4F46E5";
        break;
      case "--out":
      case "-o":
        opts.out = args[++i] || "store-assets";
        break;
      default:
        if (args[i].startsWith("-")) {
          console.error(`未知参数: ${args[i]}`);
          process.exit(1);
        }
    }
  }

  return opts;
}

function printHelp() {
  console.log(`
使用方法: node scripts/generate-app-icons.mjs [选项]

选项:
  --source, -s   1024×1024 PNG 源文件路径（可选。不提供则生成纯色占位图标）
  --name, -n     App 显示名称（必填，用于纯色占位图标中的文字）
  --color, -c    主色调（可选，默认 #4F46E5）
  --out, -o      输出目录（可选，默认 ./store-assets）
  --help, -h     显示本帮助

输出结构:
  <out>/icons/ios/      — 所有 iOS 尺寸
  <out>/icons/android/  — 所有 Android 尺寸
  <out>/icons/wechat/   — 所有微信尺寸

示例:
  node scripts/generate-app-icons.mjs --source icon.png --name "记账本" --color "#6366F1"
  node scripts/generate-app-icons.mjs --name "MyApp" --out ./build/assets
`);
}

/** 解析十六进制颜色为 RGB(A) 数字数组 */
function parseColor(hex) {
  let h = hex.replace("#", "");
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  const a = h.length >= 8 ? parseInt(h.substring(6, 8), 16) : 255;
  return [r, g, b, a];
}

/** 确保目录存在 */
function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

// ── 生成逻辑 ────────────────────────────────────────

/**
 * 使用 sharp 生成指定尺寸的图标。
 * 如果有 sourcePath，则缩放源图；否则以纯色背景 + 首字母文字生成。
 */
async function generateIcon(sourcePath, outputPath, size, appName, color) {
  const sharp = (await import("sharp")).default;

  if (sourcePath && fs.existsSync(sourcePath)) {
    // 从源图缩放
    await sharp(sourcePath)
      .resize(size, size, { fit: "cover", position: "center" })
      .png()
      .toFile(outputPath);
  } else {
    // 生成纯色占位图标：圆角矩形背景 + 首字母
    const [r, g, b, a] = parseColor(color);
    const fontSize = Math.max(12, Math.round(size * 0.45));
    const radius = Math.max(2, Math.round(size * 0.18));

    // 用 SVG 绘制圆角矩形 + 首字母
    const svg = `
      <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
        <rect
          width="${size}"
          height="${size}"
          rx="${radius}"
          ry="${radius}"
          fill="rgba(${r},${g},${b},${a / 255})"
        />
        <text
          x="50%"
          y="50%"
          dy="0.12em"
          font-family="-apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif"
          font-size="${fontSize}px"
          font-weight="bold"
          fill="white"
          text-anchor="middle"
          dominant-baseline="central"
        >${appName.charAt(0).toUpperCase()}</text>
      </svg>`;

    await sharp(Buffer.from(svg))
      .resize(size, size)
      .png()
      .toFile(outputPath);
  }
}

/** 主函数 */
async function main() {
  const opts = parseArgs();
  const start = Date.now();

  // 检查源文件
  if (opts.source && !fs.existsSync(opts.source)) {
    console.error(`错误: 源文件不存在: ${opts.source}`);
    process.exit(1);
  }

  // 验证 sharp 可用
  try {
    await import("sharp");
  } catch {
    console.error("错误: 缺少 sharp 依赖。请运行: npm install sharp");
    process.exit(1);
  }

  // 建立输出目录
  const baseDir = path.resolve(opts.out);
  const iosDir = path.join(baseDir, "icons", "ios");
  const androidDir = path.join(baseDir, "icons", "android");
  const wechatDir = path.join(baseDir, "icons", "wechat");

  ensureDir(iosDir);
  ensureDir(androidDir);
  ensureDir(wechatDir);

  console.log("══ 生成 App 图标 ══\n");
  console.log(`  名称: ${opts.name}`);
  console.log(`  颜色: ${opts.color}`);
  console.log(`  源图: ${opts.source || "（无，使用纯色占位）"}`);
  console.log(`  输出: ${baseDir}\n`);

  // ── 生成 iOS 图标 ──────────────────────────────
  console.log("  📱 iOS:");
  for (const icon of IOS_SIZES) {
    const outPath = path.join(iosDir, icon.name);
    await generateIcon(opts.source, outPath, icon.size, opts.name, opts.color);
    const kb = (fs.statSync(outPath).size / 1024).toFixed(1);
    console.log(`    ✓ ${icon.name.padEnd(24)} ${icon.size}×${icon.size}  (${kb} KB)`);
  }

  // ── 生成 Android 图标 ──────────────────────────
  console.log("\n  🤖 Android:");
  for (const icon of ANDROID_SIZES) {
    const outPath = path.join(androidDir, icon.name);
    await generateIcon(opts.source, outPath, icon.size, opts.name, opts.color);
    const kb = (fs.statSync(outPath).size / 1024).toFixed(1);
    console.log(`    ✓ ${icon.name.padEnd(28)} ${icon.size}×${icon.size} (${kb} KB)`);
  }

  // ── 生成微信图标 ──────────────────────────────
  console.log("\n  💬 微信:");
  for (const icon of WECHAT_SIZES) {
    const outPath = path.join(wechatDir, icon.name);
    await generateIcon(opts.source, outPath, icon.size, opts.name, opts.color);
    const kb = (fs.statSync(outPath).size / 1024).toFixed(1);
    console.log(`    ✓ ${icon.name.padEnd(20)} ${icon.size}×${icon.size} (${kb} KB)`);
  }

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  const totalIcons = IOS_SIZES.length + ANDROID_SIZES.length + WECHAT_SIZES.length;
  console.log(`\n✅ 完成：共生成 ${totalIcons} 个图标，耗时 ${elapsed}s`);
  console.log(`   输出目录: ${baseDir}/icons/`);
}

main().catch((err) => {
  console.error("❌ 运行时错误:", err.message);
  process.exit(1);
});
