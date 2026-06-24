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
 *
 * P2 扩展计划 — 将 Mustache 推广到全部三栈（消除 WeChat / Harmony 的裸字符串 emit）：
 *   现有：
 *     - Flutter:  templates/flutter-minimal/lib/core/widgets/industry/<industry>_widgets.dart.mustache
 *   新增：
 *     - WeChat:   templates/wechat-miniprogram-minimal/pages/industry/<industry>.wxml.mustache
 *                 templates/wechat-miniprogram-minimal/pages/industry/<industry>.js.mustache
 *     - Harmony:  templates/harmony-minimal/entry/src/main/ets/pages/industry/<industry>.ets.mustache
 *
 *   渲染上下文变量（三栈共用）：
 *     {{displayName}}   — 行业中文名（如 电商商城, 外卖点餐）
 *     {{primaryColor}}  — App 主题色（如 #0D9488）
 *     {{tableName}}     — 主实体表名（如 products, restaurants）
 *
 *   下一步：在 WechatExecutor / HarmonyExecutor 的 generateCode 中调用
 *   renderWidgetTemplate() 渲染 .wxml.mustache / .js.mustache / .ets.mustache，
 *   写入对应平台的项目目录，替代 emitEntityListIndexJs 等中的裸字符串拼接。
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

/** 编译缓存：存储模板文件路径 → 已读取的模板字符串 */
const templateCache = new Map<string, string>();

/** 预编译 Promise：首次渲染时触发批量加载 */
let precompilePromise: Promise<void> | null = null;

/**
 * 预编译所有 Mustache 模板
 * 读取 TEMPLATE_BASE 目录下所有 .dart.mustache 文件并缓存到内存中。
 * 在应用启动或首次渲染时调用一次，避免运行时重复磁盘 I/O。
 * Mustache 4.x 不支持传入预解析 token，因此"编译"指提前加载字符串到内存。
 */
export async function precompileAllTemplates(): Promise<void> {
  try {
    const files = await fs.readdir(TEMPLATE_BASE);
    const templateFiles = files.filter((f) => f.endsWith(".dart.mustache"));
    await Promise.all(
      templateFiles.map(async (f) => {
        const fullPath = path.join(TEMPLATE_BASE, f);
        const content = await fs.readFile(fullPath, "utf-8");
        templateCache.set(fullPath, content);
      })
    );
  } catch {
    // 目录不存在或读取失败时静默失败，后续将按需加载
  }
}

/**
 * 返回预编译缓存的统计信息
 */
export function getPrecompiledCache(): { size: number; templateNames: string[] } {
  return {
    size: templateCache.size,
    templateNames: Array.from(templateCache.keys()).map((k) => path.basename(k)),
  };
}

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
  const templatePath = path.join(TEMPLATE_BASE, `${templateName}.dart.mustache`);

  // 首次调用时触发预编译（批量加载所有模板）
  if (precompilePromise === null) {
    precompilePromise = precompileAllTemplates();
  }
  await precompilePromise;

  // 使用已缓存的模板内容
  const template = templateCache.get(templatePath);
  if (!template) {
    throw new Error(
      `Widget 模板文件不存在: ${templatePath}。请确保已创建对应的 .dart.mustache 文件。`
    );
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
  precompilePromise = null;
}
