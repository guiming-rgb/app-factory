/**
 * Q2-M1: Mustache 模板渲染引擎
 *
 * 替代 emit-industry.ts 中的裸字符串拼接，改用 .dart.mustache 模板文件。
 * 模板文件位于 templates/flutter-minimal/lib/core/widgets/industry/
 *
 * 优势：
 *   1. 模板本身可被 dart analyze 检查
 *   2. IDE 有 Dart 语法高亮
 *   3. 可独立测试（模板 + mock 变量）
 *   4. 不会被 linter 回退
 */
import * as fs from "fs/promises";
import * as path from "path";
import Mustache from "mustache";

const ROOT = process.cwd();
const TEMPLATE_BASE = path.join(
  ROOT,
  "templates",
  "flutter-minimal",
  "lib",
  "core",
  "widgets",
  "industry"
);

/** 渲染上下文：传给模板的变量 */
export interface WidgetTemplateContext {
  /** 行业标识（如 ecommerce, food, game） */
  industry: string;
  /** 行业中文名（如 电商商城, 外卖点餐） */
  displayName: string;
  /** 主实体表名（如 products, restaurants） */
  tableName: string;
  /** 列表标题字段（如 name, title） */
  titleField: string;
  /** 主键字段（如 id） */
  primaryKey: string;
  /** 是否有图片字段 */
  hasImage: boolean;
  /** App 主题色 */
  primaryColor: string;
  /** 额外行业变量（各行业自定义） */
  extra?: Record<string, unknown>;
}

/** 编译缓存：避免重复解析模板 */
const templateCache = new Map<string, string>();

/**
 * 加载并渲染 Mustache 模板
 * @param templateName - 模板文件名（不含 .mustache 后缀），如 "ecommerce_widgets"
 * @param context - 渲染变量
 * @returns 渲染后的 Dart 代码字符串
 */
export async function renderWidgetTemplate(
  templateName: string,
  context: WidgetTemplateContext
): Promise<string> {
  const cacheKey = `${templateName}:${JSON.stringify(context)}`;
  const templatePath = path.join(TEMPLATE_BASE, `${templateName}.dart.mustache`);

  // 读取模板（带缓存）
  let template: string;
  if (templateCache.has(templatePath)) {
    template = templateCache.get(templatePath)!;
  } else {
    try {
      template = await fs.readFile(templatePath, "utf-8");
      templateCache.set(templatePath, template);
    } catch {
      throw new Error(
        `Widget 模板文件不存在: ${templatePath}。请确保已创建对应的 .dart.mustache 文件。`
      );
    }
  }

  // Mustache 渲染
  try {
    return Mustache.render(template, context);
  } catch (e) {
    throw new Error(
      `渲染模板 ${templateName} 失败: ${(e as Error).message}`
    );
  }
}

/**
 * 检查指定行业的模板文件是否存在
 */
export async function hasWidgetTemplate(industry: string): Promise<boolean> {
  const templatePath = path.join(TEMPLATE_BASE, `${industry}_widgets.dart.mustache`);
  try {
    await fs.access(templatePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * 列出所有已安装的行业 Widget 模板
 */
export async function listWidgetTemplates(): Promise<string[]> {
  try {
    const files = await fs.readdir(TEMPLATE_BASE);
    return files
      .filter((f) => f.endsWith(".dart.mustache"))
      .map((f) => f.replace(".dart.mustache", ""));
  } catch {
    return [];
  }
}

/**
 * 清除模板缓存（测试用）
 */
export function clearTemplateCache(): void {
  templateCache.clear();
}
