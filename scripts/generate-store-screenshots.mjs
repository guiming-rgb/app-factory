#!/usr/bin/env node
/**
 * generate-store-screenshots.mjs — 为 App Store / Google Play 生成截屏素材
 *
 * 每平台生成 3 张截屏：首页/列表、详情页、功能页
 * iOS: 6.7″ (1290×2796), 6.5″ (1242×2688), 5.5″ (1242×2208)
 * Android: phone (1080×1920)
 *
 * 用法:
 *   node scripts/generate-store-screenshots.mjs \
 *       --name "MyApp" \
 *       --desc "My App Description" \
 *       --color "#4F46E5" \
 *       --out ./store-assets
 *
 * 参数:
 *   --name, -n     App 显示名称（必填）
 *   --desc, -d     App 简短描述（可选，默认 "App Description"）
 *   --color, -c    主色调（可选，默认 #4F46E5，支持 #RGB / #RRGGBB）
 *   --out, -o      输出目录（可选，默认 ./store-assets）
 *   --help, -h     显示帮助
 *
 * 输出:
 *   <out>/screenshots/ios-6.7inch-home.png, ...detail.png, ...feature.png
 *   <out>/screenshots/ios-6.5inch-home.png, ...
 *   <out>/screenshots/ios-5.5inch-home.png, ...
 *   <out>/screenshots/android-phone-home.png, ...
 *
 * 依赖:
 *   sharp（已在 devDependencies 中）
 */

import fs from "fs";
import path from "path";

// ── 截屏规格 ────────────────────────────────────────
const SCREENSHOT_SPECS = [
  {
    platform: "ios",
    label: "6.7inch",
    width: 1290,
    height: 2796,
    deviceFrame: { top: 80, bottom: 80, side: 120, cornerRadius: 120 },
  },
  {
    platform: "ios",
    label: "6.5inch",
    width: 1242,
    height: 2688,
    deviceFrame: { top: 72, bottom: 72, side: 108, cornerRadius: 110 },
  },
  {
    platform: "ios",
    label: "5.5inch",
    width: 1242,
    height: 2208,
    deviceFrame: { top: 60, bottom: 60, side: 90, cornerRadius: 90 },
  },
  {
    platform: "android",
    label: "phone",
    width: 1080,
    height: 1920,
    deviceFrame: { top: 60, bottom: 60, side: 90, cornerRadius: 60 },
  },
];

// ── 命令行参数 ──────────────────────────────────────

function parseArgs() {
  const args = process.argv.slice(2);
  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    printHelp();
    process.exit(0);
  }

  const opts = { name: "App", desc: "App Description", color: "#4F46E5", out: "store-assets" };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--name":
      case "-n":
        opts.name = args[++i] || "App";
        break;
      case "--desc":
      case "-d":
        opts.desc = args[++i] || "App Description";
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
使用方法: node scripts/generate-store-screenshots.mjs [选项]

选项:
  --name, -n     App 显示名称（必填）
  --desc, -d     App 简短描述（可选）
  --color, -c    主色调（可选，默认 #4F46E5）
  --out, -o      输出目录（可选，默认 ./store-assets）
  --help, -h     显示本帮助

输出:
  screenshots/ios-6.7inch-home.png, ...detail.png, ...feature.png
  screenshots/ios-6.5inch-home.png, ...
  screenshots/ios-5.5inch-home.png, ...
  screenshots/android-phone-home.png, ...

示例:
  node scripts/generate-store-screenshots.mjs --name "记账本" --desc "AI 智能记账" --color "#6366F1"
`);
}

// ── 颜色工具 ────────────────────────────────────────

function parseColor(hex) {
  let h = hex.replace("#", "");
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return [r, g, b];
}

function colorToCSS(color) {
  const [r, g, b] = color;
  return `rgb(${r},${g},${b})`;
}

function lighten(color, factor) {
  const [r, g, b] = color;
  return [
    Math.min(255, Math.round(r + (255 - r) * factor)),
    Math.min(255, Math.round(g + (255 - g) * factor)),
    Math.min(255, Math.round(b + (255 - b) * factor)),
  ];
}

function darken(color, factor) {
  const [r, g, b] = color;
  return [
    Math.round(r * (1 - factor)),
    Math.round(g * (1 - factor)),
    Math.round(b * (1 - factor)),
  ];
}

// ── SVG 生成函数 ────────────────────────────────────

/**
 * 生成一张截屏的完整 SVG。
 * @param {number} w  画布宽度
 * @param {number} h  画布高度
 * @param {string} appName
 * @param {string} appDesc
 * @param {number[]} color  RGB 数组
 * @param {string} screenType  'home' | 'detail' | 'feature'
 * @param {object} frame  设备边框参数 { top, bottom, side, cornerRadius }
 */
function buildScreenshotSVG(w, h, appName, appDesc, color, screenType, frame) {
  const primary = colorToCSS(color);
  const bgLight = colorToCSS(lighten(color, 0.75));
  const bgLighter = colorToCSS(lighten(color, 0.88));
  const accentDark = colorToCSS(darken(color, 0.3));
  const grayBorder = "#c0c4cc";
  const grayText = "#889096";
  const darkText = "#1d1d1f";
  const white = "#ffffff";

  // 设备屏幕区域（内边距 of device frame）
  const screenX = frame.side;
  const screenY = frame.top;
  const screenW = w - 2 * frame.side;
  const screenH = h - frame.top - frame.bottom;

  // ═══ 渐变背景 ═══
  const gradId = "bg-grad";
  const gradientBG = `
    <defs>
      <linearGradient id="${gradId}" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%"  stop-color="${bgLight}"/>
        <stop offset="100%" stop-color="${bgLighter}"/>
      </linearGradient>
    </defs>`;

  // 圆形装饰
  const circle1 = `cx="${w * 0.15}" cy="${h * 0.12}" r="${Math.min(w, h) * 0.35}" fill="${primary}" opacity="0.06"`;
  const circle2 = `cx="${w * 0.85}" cy="${h * 0.88}" r="${Math.min(w, h) * 0.4}" fill="${primary}" opacity="0.04"`;

  // ═══ 设备边框 (圆角矩形，内含截屏内容) ═══
  const deviceRadius = frame.cornerRadius;

  // — 根据不同 screenType 生成不同内容 —
  let screenContent = "";
  const contentW = screenW * 0.78;
  const contentX = screenX + (screenW - contentW) / 2;
  const statusBarH = Math.round(screenH * 0.045);

  if (screenType === "home") {
    // 首页/列表
    screenContent = `
      <!-- 状态栏 -->
      <rect x="${screenX}" y="${screenY}" width="${screenW}" height="${statusBarH}" fill="${darkText}" opacity="0.05"/>
      <text x="${screenX + 20}" y="${screenY + statusBarH * 0.62}" font-family="sans-serif" font-size="${Math.round(statusBarH * 0.45)}" fill="${grayText}">9:41</text>

      <!-- App 标题区域 -->
      <text x="${contentX}" y="${screenY + statusBarH + screenH * 0.08}" font-family="sans-serif" font-size="${Math.round(screenH * 0.038)}" font-weight="bold" fill="${darkText}">${appName}</text>

      <!-- 搜索栏 -->
      <rect x="${contentX}" y="${screenY + statusBarH + screenH * 0.12}" width="${contentW}" height="${Math.round(screenH * 0.03)}" rx="${Math.round(screenH * 0.015)}" fill="${bgLighter}" stroke="${grayBorder}" stroke-width="1"/>

      <!-- 列表项 × 4 -->
      ${[0, 1, 2, 3].map((i) => {
        const y = screenY + statusBarH + screenH * 0.18 + i * screenH * 0.14;
        return `
          <rect x="${contentX}" y="${y}" width="${Math.round(contentW * 0.15)}" height="${Math.round(screenH * 0.07)}" rx="8" fill="${primary}" opacity="0.3"/>
          <rect x="${contentX + Math.round(contentW * 0.2)}" y="${y + 4}" width="${Math.round(contentW * 0.5)}" height="${Math.round(screenH * 0.02)}" rx="4" fill="${darkText}" opacity="0.12"/>
          <rect x="${contentX + Math.round(contentW * 0.2)}" y="${y + 16 + Math.round(screenH * 0.02)}" width="${Math.round(contentW * 0.35)}" height="${Math.round(screenH * 0.015)}" rx="3" fill="${grayText}" opacity="0.3"/>
          <rect x="${contentX + Math.round(contentW * 0.85)}" y="${y + 6}" width="${Math.round(contentW * 0.12)}" height="${Math.round(screenH * 0.03)}" rx="4" fill="${primary}" opacity="0.6"/>
        `;
      }).join("")}

      <!-- 底部标签栏 -->
      <rect x="${screenX}" y="${screenY + screenH - Math.round(screenH * 0.065)}" width="${screenW}" height="${Math.round(screenH * 0.065)}" fill="${white}" stroke="${grayBorder}" stroke-width="0.5"/>
      ${["首页", "发现", "消息", "我的"].map((label, i) => {
        const x = screenX + screenW * (i + 0.5) / 4;
        return `
          <circle cx="${x}" cy="${screenY + screenH - Math.round(screenH * 0.033)}" r="7" fill="${i === 0 ? primary : grayBorder}" opacity="${i === 0 ? 0.8 : 0.4}"/>
          <text x="${x}" y="${screenY + screenH - 4}" font-family="sans-serif" font-size="8" text-anchor="middle" fill="${i === 0 ? darkText : grayText}">${label}</text>
        `;
      }).join("")}
    `;
  } else if (screenType === "detail") {
    // 详情页
    screenContent = `
      <rect x="${screenX}" y="${screenY}" width="${screenW}" height="${statusBarH}" fill="${darkText}" opacity="0.05"/>
      <text x="${screenX + 20}" y="${screenY + statusBarH * 0.62}" font-family="sans-serif" font-size="${Math.round(statusBarH * 0.45)}" fill="${grayText}">9:41</text>

      <!-- 返回箭头 + 标题 -->
      <polyline points="${screenX + 16},${screenY + statusBarH + screenH * 0.03} ${screenX + 26},${screenY + statusBarH + screenH * 0.025} ${screenX + 36},${screenY + statusBarH + screenH * 0.03}" fill="none" stroke="${primary}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
      <text x="${screenX + screenW * 0.12}" y="${screenY + statusBarH + screenH * 0.04}" font-family="sans-serif" font-size="${Math.round(screenH * 0.028)}" font-weight="600" fill="${darkText}">详情</text>

      <!-- 大图占位 -->
      <rect x="${contentX}" y="${screenY + statusBarH + screenH * 0.07}" width="${contentW}" height="${Math.round(screenH * 0.3)}" rx="12" fill="${primary}" opacity="0.15"/>
      <rect x="${contentX + Math.round(contentW * 0.35)}" y="${screenY + statusBarH + screenH * 0.2}" width="${Math.round(contentW * 0.3)}" height="${Math.round(screenH * 0.04)}" rx="6" fill="${primary}" opacity="0.4"/>
      <text x="${contentX + contentW / 2}" y="${screenY + statusBarH + screenH * 0.27}" font-family="sans-serif" font-size="${Math.round(screenH * 0.028)}" fill="${darkText}" text-anchor="middle" font-weight="600">${appName}</text>

      <!-- 描述文字 -->
      <text x="${contentX}" y="${screenY + statusBarH + screenH * 0.42}" font-family="sans-serif" font-size="${Math.round(screenH * 0.024)}" font-weight="bold" fill="${darkText}">${appDesc}</text>
      <rect x="${contentX}" y="${screenY + statusBarH + screenH * 0.455}" width="${contentW}" height="${Math.round(screenH * 0.015)}" rx="4" fill="${grayText}" opacity="0.2"/>
      <rect x="${contentX}" y="${screenY + statusBarH + screenH * 0.48}" width="${Math.round(contentW * 0.7)}" height="${Math.round(screenH * 0.015)}" rx="4" fill="${grayText}" opacity="0.15"/>

      <!-- 按钮 -->
      <rect x="${contentX}" y="${screenY + statusBarH + screenH * 0.55}" width="${contentW}" height="${Math.round(screenH * 0.055)}" rx="${Math.round(screenH * 0.028)}" fill="${primary}"/>
      <text x="${contentX + contentW / 2}" y="${screenY + statusBarH + screenH * 0.585}" font-family="sans-serif" font-size="${Math.round(screenH * 0.026)}" fill="${white}" text-anchor="middle" font-weight="600">开始使用</text>
    `;
  } else {
    // feature 页 — 展示核心功能亮点
    const features = [
      { icon: "★", label: "智能分析" },
      { icon: "●", label: "实时同步" },
      { icon: "◆", label: "安全加密" },
      { icon: "▲", label: "多端适配" },
    ];

    screenContent = `
      <rect x="${screenX}" y="${screenY}" width="${screenW}" height="${statusBarH}" fill="${darkText}" opacity="0.05"/>
      <text x="${screenX + 20}" y="${screenY + statusBarH * 0.62}" font-family="sans-serif" font-size="${Math.round(statusBarH * 0.45)}" fill="${grayText}">9:41</text>

      <!-- 功能标题 -->
      <text x="${contentX}" y="${screenY + statusBarH + screenH * 0.07}" font-family="sans-serif" font-size="${Math.round(screenH * 0.036)}" font-weight="bold" fill="${darkText}">核心功能</text>
      <text x="${contentX}" y="${screenY + statusBarH + screenH * 0.105}" font-family="sans-serif" font-size="${Math.round(screenH * 0.022)}" fill="${grayText}">${appName} 带来的强大体验</text>

      <!-- 功能卡片网格 (2×2) -->
      ${features.map((f, i) => {
        const col = i % 2;
        const row = Math.floor(i / 2);
        const cardW = (contentW - 20) / 2;
        const cardH = Math.round(screenH * 0.22);
        const cx = contentX + col * (cardW + 20);
        const cy = screenY + statusBarH + screenH * 0.13 + row * (cardH + 16);
        return `
          <rect x="${cx}" y="${cy}" width="${cardW}" height="${cardH}" rx="12" fill="${white}" stroke="${grayBorder}" stroke-width="1" opacity="0.9"/>
          <text x="${cx + cardW / 2}" y="${cy + cardH * 0.3}" font-family="sans-serif" font-size="${Math.round(cardH * 0.28)}" text-anchor="middle" fill="${primary}" opacity="0.7">${f.icon}</text>
          <text x="${cx + cardW / 2}" y="${cy + cardH * 0.52}" font-family="sans-serif" font-size="${Math.round(cardH * 0.1)}" text-anchor="middle" font-weight="600" fill="${darkText}">${f.label}</text>
          <rect x="${cx + cardW * 0.15}" y="${cy + cardH * 0.6}" width="${Math.round(cardW * 0.7)}" height="${Math.round(cardH * 0.08)}" rx="4" fill="${grayText}" opacity="0.1"/>
          <rect x="${cx + cardW * 0.15}" y="${cy + cardH * 0.72}" width="${Math.round(cardW * 0.5)}" height="${Math.round(cardH * 0.08)}" rx="4" fill="${grayText}" opacity="0.08"/>
        `;
      }).join("")}
    `;
  }

  // ═══ 组装 SVG ═══
  return `
    <svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">
      ${gradientBG}
      <!-- 背景 -->
      <rect width="${w}" height="${h}" fill="url(#${gradId})"/>
      <circle ${circle1}/>
      <circle ${circle2}/>

      <!-- 设备圆角裁切组 -->
      <clipPath id="device-clip">
        <rect x="${screenX}" y="${screenY}" width="${screenW}" height="${screenH}" rx="${deviceRadius}" ry="${deviceRadius}"/>
      </clipPath>

      <!-- 截屏内容（被裁切到设备圆角内） -->
      <g clip-path="url(#device-clip)">
        <rect x="${screenX}" y="${screenY}" width="${screenW}" height="${screenH}" fill="${white}"/>
        ${screenContent}
      </g>

      <!-- 设备边框描边（重叠在内容之上） -->
      <rect x="${screenX}" y="${screenY}" width="${screenW}" height="${screenH}" rx="${deviceRadius}" ry="${deviceRadius}" fill="none" stroke="${grayBorder}" stroke-width="3"/>
    </svg>`;
}

// ── 主函数 ──────────────────────────────────────────

async function main() {
  const opts = parseArgs();
  const start = Date.now();
  const color = parseColor(opts.color);

  // 验证 sharp
  try {
    await import("sharp");
  } catch {
    console.error("错误: 缺少 sharp 依赖。请运行: npm install sharp");
    process.exit(1);
  }

  const sharp = (await import("sharp")).default;

  const baseDir = path.resolve(opts.out);
  const screenshotsDir = path.join(baseDir, "screenshots");
  fs.mkdirSync(screenshotsDir, { recursive: true });

  console.log("══ 生成商店截屏 ══\n");
  console.log(`  名称: ${opts.name}`);
  console.log(`  描述: ${opts.desc}`);
  console.log(`  颜色: ${opts.color}`);
  console.log(`  输出: ${screenshotsDir}\n`);

  const screenTypes = [
    { key: "home", label: "首页" },
    { key: "detail", label: "详情" },
    { key: "feature", label: "功能" },
  ];

  let totalGenerated = 0;

  for (const spec of SCREENSHOT_SPECS) {
    const platform = spec.platform;
    const label = spec.label;

    for (const st of screenTypes) {
      const svgContent = buildScreenshotSVG(
        spec.width,
        spec.height,
        opts.name,
        opts.desc,
        color,
        st.key,
        spec.deviceFrame,
      );

      const filename = `${platform}-${label}-${st.key}.png`;
      const outPath = path.join(screenshotsDir, filename);

      await sharp(Buffer.from(svgContent))
        .png()
        .toFile(outPath);

      const kb = (fs.statSync(outPath).size / 1024).toFixed(1);
      const dims = `${spec.width}×${spec.height}`;
      console.log(`  ✓ ${filename.padEnd(42)} ${dims.padEnd(16)} ${kb.padStart(6)} KB  (${st.label})`);
      totalGenerated++;
    }
  }

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`\n✅ 完成：共生成 ${totalGenerated} 张截屏，耗时 ${elapsed}s`);
  console.log(`   输出目录: ${screenshotsDir}/`);
}

main().catch((err) => {
  console.error("❌ 运行时错误:", err.message);
  process.exit(1);
});
