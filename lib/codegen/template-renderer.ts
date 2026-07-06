/**
 * Q2-M1: Mustache 模板渲染引擎（三栈）
 *
 * Flutter:  .dart.mustache
 * WeChat:    .wxml.mustache / .js.mustache（白名单占位符，保留 {{products}} 等小程序语法）
 * Harmony:   .ets.mustache（白名单占位符）
 */
import * as fs from "fs/promises";
import * as path from "path";
import Mustache from "mustache";

const ROOT = process.cwd();

export type PlatformTemplateKind =
  | "flutter-widgets"
  | "flutter-extended"
  | "flutter-fintech"
  | "wechat-wxml"
  | "wechat-js"
  | "harmony-ets";

const PLATFORM_CONFIG: Record<
  PlatformTemplateKind,
  { baseDir: string; extension: string }
> = {
  "flutter-widgets": {
    baseDir: path.join(
      ROOT,
      "templates",
      "flutter-minimal",
      "lib",
      "core",
      "widgets",
      "industry",
    ),
    extension: ".dart.mustache",
  },
  "flutter-extended": {
    baseDir: path.join(
      ROOT,
      "templates",
      "flutter-minimal",
      "lib",
      "pages",
      "extended",
    ),
    extension: ".dart.mustache",
  },
  "flutter-fintech": {
    baseDir: path.join(
      ROOT,
      "templates",
      "flutter-minimal",
      "lib",
      "pages",
      "fintech",
    ),
    extension: ".dart.mustache",
  },
  "wechat-wxml": {
    baseDir: path.join(
      ROOT,
      "templates",
      "wechat-miniprogram-minimal",
      "pages",
      "industry",
    ),
    extension: ".wxml.mustache",
  },
  "wechat-js": {
    baseDir: path.join(
      ROOT,
      "templates",
      "wechat-miniprogram-minimal",
      "pages",
      "industry",
    ),
    extension: ".js.mustache",
  },
  "harmony-ets": {
    baseDir: path.join(
      ROOT,
      "templates",
      "harmony-minimal",
      "entry",
      "src",
      "main",
      "ets",
      "pages",
      "industry",
    ),
    extension: ".ets.mustache",
  },
};

/** Mustache 白名单键 — 用于 WeChat/Harmony，避免与 {{products}} 等冲突 */
const WHITELIST_TEMPLATE_KEYS = [
  "industry",
  "displayName",
  "tableName",
  "titleField",
  "primaryKey",
  "primaryColor",
  "screenTitle",
  "hasImage",
] as const;

/** 渲染上下文：传给模板的变量 */
export interface WidgetTemplateContext {
  industry: string;
  displayName: string;
  tableName: string;
  titleField: string;
  primaryKey: string;
  hasImage: boolean;
  primaryColor: string;
  extra?: Record<string, unknown>;
  screenTitle?: string;
}

const templateCache = new Map<string, string>();
const precompilePromises = new Map<PlatformTemplateKind, Promise<void>>();

function resolveTemplateKind(templateName: string): PlatformTemplateKind {
  if (templateName.endsWith("_widgets")) return "flutter-widgets";
  if (templateName.endsWith("_wxml")) return "wechat-wxml";
  if (templateName.endsWith("_js")) return "wechat-js";
  if (templateName.endsWith("_ets")) return "harmony-ets";
  return "flutter-widgets";
}

function resolveTemplatePath(
  kind: PlatformTemplateKind,
  fileStem: string,
): string {
  const cfg = PLATFORM_CONFIG[kind];
  return path.join(cfg.baseDir, `${fileStem}${cfg.extension}`);
}

function resolveIndustryFromTemplateName(templateName: string): string {
  return templateName
    .replace(/_widgets$/, "")
    .replace(/_wxml$/, "")
    .replace(/_js$/, "")
    .replace(/_ets$/, "");
}

function renderWithWhitelist(
  template: string,
  context: WidgetTemplateContext & Record<string, unknown>,
): string {
  let result = template;
  for (const key of WHITELIST_TEMPLATE_KEYS) {
    const val = context[key];
    if (val === undefined || val === null) continue;
    const replacement =
      typeof val === "boolean" ? String(val) : String(val);
    result = result.replace(
      new RegExp(`\\{\\{${key}\\}\\}`, "g"),
      replacement,
    );
  }
  return result;
}

async function precompilePlatformTemplates(
  kind: PlatformTemplateKind,
): Promise<void> {
  const cfg = PLATFORM_CONFIG[kind];
  try {
    const files = await fs.readdir(cfg.baseDir);
    const templateFiles = files.filter((f) => f.endsWith(cfg.extension));
    await Promise.all(
      templateFiles.map(async (f) => {
        const fullPath = path.join(cfg.baseDir, f);
        const content = await fs.readFile(fullPath, "utf-8");
        templateCache.set(fullPath, content);
      }),
    );
  } catch (err) {
    console.warn(
      `[template-renderer] precompile skipped for ${kind}:`,
      err instanceof Error ? err.message : err,
    );
  }
}

async function ensurePrecompiled(kind: PlatformTemplateKind): Promise<void> {
  if (!precompilePromises.has(kind)) {
    precompilePromises.set(kind, precompilePlatformTemplates(kind));
  }
  await precompilePromises.get(kind);
}

export async function precompileAllTemplates(): Promise<void> {
  await Promise.all(
    (Object.keys(PLATFORM_CONFIG) as PlatformTemplateKind[]).map((kind) =>
      ensurePrecompiled(kind),
    ),
  );
}

export function getPrecompiledCache(): {
  size: number;
  templateNames: string[];
} {
  return {
    size: templateCache.size,
    templateNames: Array.from(templateCache.keys()).map((k) =>
      path.basename(k),
    ),
  };
}

export async function hasPlatformTemplate(
  kind: PlatformTemplateKind,
  industry: string,
): Promise<boolean> {
  const cfg = PLATFORM_CONFIG[kind];
  const fileStem =
    kind === "flutter-widgets" ? `${industry}_widgets` : industry;
  const templatePath = path.join(cfg.baseDir, `${fileStem}${cfg.extension}`);
  try {
    await fs.access(templatePath);
    return true;
  } catch {
    return false;
  }
}

export async function renderWidgetTemplate(
  templateName: string,
  context: WidgetTemplateContext,
): Promise<string> {
  const kind = resolveTemplateKind(templateName);
  const industry = resolveIndustryFromTemplateName(templateName);
  const fileStem =
    kind === "flutter-widgets" ? `${industry}_widgets` : industry;
  const templatePath = resolveTemplatePath(kind, fileStem);

  await ensurePrecompiled(kind);

  let template = templateCache.get(templatePath);
  if (!template) {
    try {
      template = await fs.readFile(templatePath, "utf-8");
      templateCache.set(templatePath, template);
    } catch {
      throw new Error(
        `Widget 模板文件不存在: ${templatePath}。请确保已创建对应的 ${PLATFORM_CONFIG[kind].extension} 文件。`,
      );
    }
  }

  const view = { ...context, ...(context.extra ?? {}) };

  try {
    if (kind === "flutter-widgets") {
      return Mustache.render(template, view);
    }
    return renderWithWhitelist(template, view);
  } catch (e) {
    throw new Error(
      `渲染模板 ${templateName} 失败: ${(e as Error).message}`,
    );
  }
}

export async function hasWidgetTemplate(industry: string): Promise<boolean> {
  return hasPlatformTemplate("flutter-widgets", industry);
}

export async function listWidgetTemplates(): Promise<string[]> {
  const cfg = PLATFORM_CONFIG["flutter-widgets"];
  try {
    const files = await fs.readdir(cfg.baseDir);
    return files
      .filter((f) => f.endsWith(".dart.mustache"))
      .map((f) => f.replace(".dart.mustache", ""));
  } catch {
    return [];
  }
}

export function clearTemplateCache(): void {
  templateCache.clear();
  precompilePromises.clear();
}

export type PageTemplateKind = "flutter-extended" | "flutter-fintech";

export async function hasPageTemplate(
  kind: PageTemplateKind,
  templateStem: string,
): Promise<boolean> {
  const cfg = PLATFORM_CONFIG[kind];
  const templatePath = path.join(cfg.baseDir, `${templateStem}${cfg.extension}`);
  try {
    await fs.access(templatePath);
    return true;
  } catch {
    return false;
  }
}

/** B2: Flutter extended/fintech 页 Mustache 渲染 */
export async function renderPageTemplate(
  kind: PageTemplateKind,
  templateStem: string,
  context: Record<string, unknown>,
): Promise<string> {
  await ensurePrecompiled(kind);
  const cfg = PLATFORM_CONFIG[kind];
  const templatePath = path.join(cfg.baseDir, `${templateStem}${cfg.extension}`);

  let template = templateCache.get(templatePath);
  if (!template) {
    try {
      template = await fs.readFile(templatePath, "utf-8");
      templateCache.set(templatePath, template);
    } catch {
      throw new Error(
        `页模板不存在: ${templatePath}。请创建 ${cfg.extension} 文件。`,
      );
    }
  }

  try {
    return Mustache.render(template, context);
  } catch (e) {
    throw new Error(
      `渲染页模板 ${kind}/${templateStem} 失败: ${(e as Error).message}`,
    );
  }
}
