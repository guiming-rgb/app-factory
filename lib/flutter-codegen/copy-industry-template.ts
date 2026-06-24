import fs from "fs/promises";
import path from "path";
import type { IndustryCategory } from "./emit-industry";
import { renderWidgetTemplate, hasWidgetTemplate } from "../codegen/template-renderer";

const ROOT = process.cwd();
const INDUSTRY_TEMPLATE_DIR = path.join(ROOT, "templates");

/**
 * 将行业模板文件拷贝到生成的 Flutter 项目上。
 * 基础模板（flutter-minimal）已由调用方拷贝完，这里只叠行业层。
 *
 * Q2-M1: 叠加 Mustache Widget 模板渲染
 *   - 从 templates/flutter-minimal/lib/core/widgets/industry/<industry>_widgets.dart.mustache 渲染
 *   - 写入 <appDir>/lib/core/widgets/industry_widgets.dart
 *   - 无模板时使用 generic 兜底
 */
export async function copyIndustryTemplate(
  appDir: string,
  industry: IndustryCategory
): Promise<{ copied: number; skipped: number }> {
  if (industry === "generic") {
    // generic 行业：只写兜底 Widget，不拷贝行业模板
    return copyGenericWidget(appDir);
  }

  const srcDir = path.join(INDUSTRY_TEMPLATE_DIR, `industry-${industry}`);
  let copied = 0, skipped = 0;

  try {
    await fs.access(srcDir);
  } catch {
    // 行业模板目录不存在：仅渲染 Widget 模板
    return renderAndWriteWidget(appDir, industry, copied);
  }

  async function walk(src: string, base: string) {
    const entries = await fs.readdir(src, { withFileTypes: true });
    for (const ent of entries) {
      const rel = path.join(base, ent.name);
      const from = path.join(src, ent.name);
      const to = path.join(appDir, rel);

      if (ent.isDirectory()) {
        await fs.mkdir(to, { recursive: true });
        await walk(from, rel);
      } else if (ent.isFile()) {
        try {
          await fs.copyFile(from, to);
          copied++;
        } catch { skipped++; }
      }
    }
  }

  // 拷贝 lib/ 下的行业文件（features/<industry>/）
  const libSrc = path.join(srcDir, "lib");
  try {
    await fs.access(libSrc);
    await walk(libSrc, "lib");
  } catch { /* 行业模板可能无 lib 目录 */ }

  // Q2-M1: 渲染 Mustache Widget 模板并写入
  return renderAndWriteWidget(appDir, industry, copied);
}

/** 渲染 Widget Mustache 模板并写入生成项目 */
async function renderAndWriteWidget(
  appDir: string,
  industry: IndustryCategory,
  copied: number
): Promise<{ copied: number; skipped: number }> {
  const widgetDir = path.join(appDir, "lib", "core", "widgets");
  await fs.mkdir(widgetDir, { recursive: true });
  const outPath = path.join(widgetDir, "industry_widgets.dart");

  // 构建渲染上下文
  const context = {
    industry,
    displayName: industryDisplayName(industry),
    tableName: industryTableName(industry),
    titleField: "title",
    primaryKey: "id",
    hasImage: industryHasImage(industry),
    primaryColor: "Color(0xFF0D9488)", // teal-600 default
    extra: {},
  };

  try {
    const templateName = `${industry}_widgets`;
    const hasTemplate = await hasWidgetTemplate(industry);

    if (hasTemplate) {
      const rendered = await renderWidgetTemplate(templateName, context);
      await fs.writeFile(outPath, rendered, "utf-8");
      console.log(`[copyIndustryTemplate] 渲染 ${industry} Widget 模板 → ${outPath}`);
    } else {
      // 兜底：写一个空的 industry_widgets.dart（避免 import 报错）
      await fs.writeFile(
        outPath,
        `// ${industry} Widget 模板尚未创建 — 使用通用组件
import "package:flutter/material.dart";
import "../../../core/theme/app_theme.dart";

// TODO: 补充 ${industry} 行业专属 Widget
`,
        "utf-8"
      );
      console.log(`[copyIndustryTemplate] ${industry} Widget 模板缺失，使用兜底`);
    }
  } catch (e) {
    console.warn(`[copyIndustryTemplate] 渲染 ${industry} Widget 失败: ${(e as Error).message}`);
    // 不抛异常 — Widget 缺失不应阻断代码生成
  }

  return { copied, skipped: 0 };
}

/** generic 行业：写入空 Widget 文件 */
async function copyGenericWidget(
  appDir: string
): Promise<{ copied: number; skipped: number }> {
  const widgetDir = path.join(appDir, "lib", "core", "widgets");
  await fs.mkdir(widgetDir, { recursive: true });
  const outPath = path.join(widgetDir, "industry_widgets.dart");

  await fs.writeFile(
    outPath,
    `// generic — 无行业专属 Widget
import "package:flutter/material.dart";

/// 通用功能卡片
class FeatureCard extends StatelessWidget {
  final String title, subtitle;
  final IconData icon;
  final VoidCallback? onTap;
  const FeatureCard({super.key, required this.title, required this.subtitle, required this.icon, this.onTap});

  @override
  Widget build(BuildContext context) => Card(
    child: ListTile(
      leading: Icon(icon),
      title: Text(title),
      subtitle: Text(subtitle),
      trailing: const Icon(Icons.chevron_right),
      onTap: onTap,
    ),
  );
}
`,
    "utf-8"
  );
  return { copied: 0, skipped: 0 };
}

// ─── 辅助函数 ────────────────────────────────────

function industryDisplayName(industry: IndustryCategory): string {
  const map: Record<string, string> = {
    finance: "记账理财", crm: "客户管理", fitness: "健身助手",
    ecommerce: "电商商城", education: "课程助手", social: "社交社区",
    food: "外卖点餐", hotel: "酒店预订", recruitment: "招聘求职",
    property: "智慧物业", video: "影音娱乐", weather: "天气预报",
    sports: "体育赛事", photo: "照片社区", dating: "交友匹配",
    medical: "在线问诊", blog: "博客阅读", game: "游戏中心",
    payment: "收银支付",
  };
  return map[industry] ?? "通用";
}

function industryTableName(industry: IndustryCategory): string {
  const map: Record<string, string> = {
    finance: "transactions", crm: "contacts", fitness: "workouts",
    ecommerce: "products", education: "courses", social: "posts",
    food: "restaurants", hotel: "hotels", recruitment: "jobs",
    property: "repairs", video: "videos", weather: "cities",
    sports: "matches", photo: "photos", dating: "user_profiles",
    medical: "doctors", blog: "articles", game: "game_scores",
    payment: "orders",
  };
  return map[industry] ?? "items";
}

function industryHasImage(industry: IndustryCategory): boolean {
  // 以下行业以图片为核心
  const withImages = ["ecommerce", "social", "food", "photo", "dating", "video", "blog"];
  return withImages.includes(industry);
}
