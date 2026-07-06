import fs from "fs/promises";
import path from "path";
import os from "os";

import type { AppSpec, AppSpecScreen } from "@/lib/app-spec/types";
import { validateAppSpec } from "@/lib/app-spec/validate";
import {
  formatBackendTargetMarkdown,
  resolveBackendTarget
} from "@/lib/app-spec/backend-target";
import { isTodoAppSpec } from "@/lib/app-spec/detect-todo-app";
import { zipDirectory } from "@/lib/codegen/zip";
import {
  emitEntityListIndexJs,
  emitEntityListIndexWxml,
  emitEntityListIndexWxss,
  ensureEntityDetailInAppJson,
  writeEntityDetailPage
} from "./emit-entity-list";
import {
  emitTodoIndexJs,
  emitTodoIndexWxml,
  emitTodoIndexWxss
} from "./emit-todo";
import { resolveEntityForScreen } from "@/lib/app-spec/entity-scaffold";
import {
  buildAppJson,
  emitGeneratedPageJs,
  emitGeneratedPageJson,
  emitGeneratedPageWxml,
  listScreenFromSpec,
  patchIndexJsonTitle,
  patchIndexWxml,
  patchProjectConfigName,
  wechatPagePath
} from "./emit";
import { resolveCodegenScreens } from "@/lib/app-spec/resolve-codegen-screens";
import type { IndustryCategory } from "@/lib/app-spec/industry";
import {
  wechatIndustryListCall,
  wechatIndustryRequireLine,
} from "./industry-bindings";
import { hasPlatformTemplate, renderWidgetTemplate } from "@/lib/codegen/template-renderer";

const TEMPLATE_DIR = path.join(
  process.cwd(),
  "templates",
  "wechat-miniprogram-minimal"
);

async function copyTemplate(destDir: string): Promise<void> {
  await fs.cp(TEMPLATE_DIR, destDir, { recursive: true });
}

async function ensureGeneratedPage(
  appDir: string,
  screen: AppSpecScreen,
  industry: IndustryCategory = "generic"
): Promise<void> {
  const pagePath = wechatPagePath(screen.id);
  if (pagePath === "pages/index/index" || pagePath === "pages/profile/profile") {
    return;
  }
  const [, pageId, fileName] = pagePath.split("/");
  const fileBase = path.join(appDir, "pages", pageId, fileName);
  await fs.mkdir(path.dirname(fileBase), { recursive: true });
  const specPath = path.join(appDir, "app_spec.json");
  let specForPage: AppSpec | undefined;
  try {
    specForPage = JSON.parse(await fs.readFile(specPath, "utf8")) as AppSpec;
  } catch {
    specForPage = undefined;
  }
  // 扩展页面类型路由
  const isExtended = [
    "dashboard",
    "card_grid",
    "calendar",
    "kanban",
    "chart",
    "onboarding",
    "game",
    "payment",
  ].includes(screen.type);
  if (isExtended && specForPage) {
    const ext = await import("./emit-extended");
    if (screen.type === "dashboard") {
      await fs.writeFile(`${fileBase}.wxml`, ext.emitWechatDashboardWxml(screen, specForPage), "utf8");
      await fs.writeFile(`${fileBase}.js`, ext.emitWechatDashboardJs(screen, specForPage, industry), "utf8");
    } else if (screen.type === "card_grid") {
      await fs.writeFile(`${fileBase}.wxml`, ext.emitWechatCardGridWxml(screen, specForPage), "utf8");
      await fs.writeFile(`${fileBase}.js`, ext.emitWechatCardGridJs(screen, specForPage, industry), "utf8");
    } else if (screen.type === "calendar") {
      await fs.writeFile(`${fileBase}.wxml`, ext.emitWechatCalendarWxml(screen), "utf8");
      await fs.writeFile(`${fileBase}.js`, ext.emitWechatCalendarJs(screen, specForPage, industry), "utf8");
    } else if (screen.type === "kanban") {
      await fs.writeFile(`${fileBase}.wxml`, ext.emitWechatKanbanWxml(screen), "utf8");
      await fs.writeFile(`${fileBase}.js`, ext.emitWechatKanbanJs(screen, specForPage, industry), "utf8");
    } else if (screen.type === "chart") {
      await fs.writeFile(`${fileBase}.wxml`, ext.emitWechatChartWxml(screen), "utf8");
      await fs.writeFile(`${fileBase}.js`, ext.emitWechatChartJs(screen, specForPage), "utf8");
    } else if (screen.type === "onboarding") {
      await fs.writeFile(`${fileBase}.wxml`, ext.emitWechatOnboardingWxml(), "utf8");
      await fs.writeFile(`${fileBase}.js`, ext.emitWechatOnboardingJs(), "utf8");
    } else if (screen.type === "game") {
      await fs.writeFile(`${fileBase}.wxml`, ext.emitWechatGameWxml(), "utf8");
      await fs.writeFile(`${fileBase}.js`, ext.emitWechatGameJs(), "utf8");
    } else if (screen.type === "payment") {
      await fs.writeFile(`${fileBase}.wxml`, ext.emitWechatPaymentWxml(), "utf8");
      await fs.writeFile(`${fileBase}.js`, ext.emitWechatPaymentJs(), "utf8");
    }
    const wxss =
      screen.type === "chart" || screen.type === "onboarding"
        ? ext.emitWechatChartOnboardingWxss()
        : screen.type === "game" || screen.type === "payment"
          ? ext.emitWechatGamePaymentWxss()
          : ext.emitWechatExtendedWxss();
    await fs.writeFile(`${fileBase}.wxss`, wxss, "utf8");
  } else {
    // Q2-P2: Mustache 优先 — 有行业模板时走 Mustache 渲染，否则 fallback 裸字符串 emit
    const hasMustache =
      industry !== "generic" &&
      (await hasPlatformTemplate("wechat-wxml", industry)) &&
      (await hasPlatformTemplate("wechat-js", industry));
    if (hasMustache) {
      const ctx = { industry, displayName: specForPage?.displayName || screen.title, tableName: screen.entity || "items", primaryColor: "#0D9488", titleField: "title", primaryKey: "id", hasImage: false };
      try {
        const [wxmlRendered, jsRendered] = await Promise.all([
          renderWidgetTemplate(`${industry}_wxml`, { ...ctx, screenTitle: screen.title } as any),
          renderWidgetTemplate(`${industry}_js`, { ...ctx, screenTitle: screen.title } as any),
        ]);
        if (/^Page\(\{\}\);?\s*$/.test(jsRendered.trim())) {
          throw new Error(`Mustache JS 模板渲染为空 Page({})：industry=${industry}`);
        }
        await fs.writeFile(`${fileBase}.wxml`, wxmlRendered, "utf8");
        await fs.writeFile(`${fileBase}.js`, jsRendered, "utf8");
      } catch (err) {
        console.warn(
          `[wechat-codegen] Mustache 渲染失败 (industry=${industry}, screen=${screen.id}):`,
          err
        );
        throw err;
      }
    } else {
      await fs.writeFile(`${fileBase}.wxml`, emitGeneratedPageWxml(screen, specForPage), "utf8");
      await fs.writeFile(`${fileBase}.js`, emitGeneratedPageJs(), "utf8");
    }
    await fs.writeFile(`${fileBase}.wxss`, "", "utf8");
  }
  await fs.writeFile(`${fileBase}.json`, emitGeneratedPageJson(screen), "utf8");
}

export type WechatCodegenResult = {
  outputDir: string;
  appName: string;
  displayName: string;
};

export async function generateWechatProject(
  specInput: unknown
): Promise<WechatCodegenResult> {
  const validation = validateAppSpec(specInput);
  if (!validation.ok) {
    throw new Error(`App Spec 校验失败：${validation.errors.join("; ")}`);
  }
  const spec = validation.spec;

  const { detectIndustry } = await import("@/lib/app-spec/industry");
  const industry = detectIndustry(spec as unknown as Record<string, unknown>);

  const outRoot = await fs.mkdtemp(
    path.join(os.tmpdir(), "app-factory-wechat-")
  );
  const appDir = path.join(outRoot, spec.appName);
  await copyTemplate(appDir);

  await fs.writeFile(
    path.join(appDir, "industry.json"),
    JSON.stringify({ industry, servicesModule: "services/industry.js" }, null, 2) + "\n",
    "utf8"
  );

  await fs.writeFile(
    path.join(appDir, "app_spec.json"),
    JSON.stringify(spec, null, 2),
    "utf8"
  );

  // P1: 生成 Supabase 建表 SQL
  const { generateCreateTableDDL } = await import("@/lib/app-spec/generate-ddl");
  const ddl = generateCreateTableDDL(spec);
  const sqlDir = path.join(appDir, "supabase", "migrations");
  await fs.mkdir(sqlDir, { recursive: true });
  await fs.writeFile(
    path.join(sqlDir, "001_create_tables.sql"),
    ddl.fullSql,
    "utf8"
  );
  await fs.writeFile(
    path.join(appDir, "supabase", "README.md"),
    `# Supabase 后端配置\n\n本目录包含 App 生产工厂自动生成的数据库迁移脚本。\n\n## 使用方法\n\n1. 登录 [Supabase](https://supabase.com) 控制台\n2. 进入项目 → SQL Editor\n3. 粘贴 \`migrations/001_create_tables.sql\` 内容并执行\n\n## 表结构\n\n${ddl.tableNames.length ? ddl.tableNames.map((t) => `- **${t}**`).join("\n") : "（无）"}\n`,
    "utf8"
  );

  const limitations = spec.limitations?.length
    ? spec.limitations.map((l) => `- ${l}`).join("\n")
    : "- （无）";
  await fs.writeFile(
    path.join(appDir, "LIMITATIONS.md"),
    `# 生成说明（微信小程序）\n\n- displayName: ${spec.displayName}\n- sourceProjectId: ${spec.sourceProjectId ?? "—"}\n- generatedAt: ${new Date().toISOString()}\n\n## limitations\n\n${limitations}\n`,
    "utf8"
  );

  const backendTarget = resolveBackendTarget(spec);
  await fs.writeFile(
    path.join(appDir, "BACKEND.md"),
    formatBackendTargetMarkdown(spec, backendTarget),
    "utf8"
  );

  const appJsonPath = path.join(appDir, "app.json");
  const baseAppJson = JSON.parse(
    await fs.readFile(appJsonPath, "utf8")
  ) as Record<string, unknown>;
  const todoMode = isTodoAppSpec(spec);
  const listScreen = listScreenFromSpec(spec);
  let appJson = buildAppJson(spec, baseAppJson) as Record<string, unknown> & { pages: string[] };
  const entityForDetail =
    listScreen && !todoMode
      ? resolveEntityForScreen(spec, listScreen)
      : undefined;
  if (entityForDetail) {
    appJson = ensureEntityDetailInAppJson(appJson) as typeof appJson;
    await writeEntityDetailPage(appDir, entityForDetail, fs, path, industry);
  }
  await fs.writeFile(
    appJsonPath,
    JSON.stringify(appJson, null, 2) + "\n",
    "utf8"
  );

  const projPath = path.join(appDir, "project.config.json");
  const proj = await fs.readFile(projPath, "utf8");
  await fs.writeFile(
    projPath,
    patchProjectConfigName(proj, spec.appName, spec.displayName),
    "utf8"
  );

  if (listScreen && todoMode) {
    const indexWxml = path.join(appDir, "pages/index/index.wxml");
    const indexJs = path.join(appDir, "pages/index/index.js");
    const indexWxss = path.join(appDir, "pages/index/index.wxss");
    const indexJson = path.join(appDir, "pages/index/index.json");
    await fs.writeFile(
      indexWxml,
      emitTodoIndexWxml(spec.displayName),
      "utf8"
    );
    await fs.writeFile(indexJs, emitTodoIndexJs(), "utf8");
    const baseWxss = await fs.readFile(
      path.join(appDir, "app.wxss"),
      "utf8"
    );
    await fs.writeFile(
      indexWxss,
      `${baseWxss}\n${emitTodoIndexWxss()}`,
      "utf8"
    );
    await fs.writeFile(
      indexJson,
      patchIndexJsonTitle(
        await fs.readFile(indexJson, "utf8"),
        listScreen.title
      ),
      "utf8"
    );
  } else if (listScreen && resolveEntityForScreen(spec, listScreen)) {
    const indexWxml = path.join(appDir, "pages/index/index.wxml");
    const indexJs = path.join(appDir, "pages/index/index.js");
    const indexWxss = path.join(appDir, "pages/index/index.wxss");
    const indexJson = path.join(appDir, "pages/index/index.json");
    await fs.writeFile(
      indexWxml,
      emitEntityListIndexWxml(spec, listScreen),
      "utf8"
    );
    await fs.writeFile(indexJs, emitEntityListIndexJs(spec, listScreen, industry), "utf8");
    const baseWxss = await fs.readFile(path.join(appDir, "app.wxss"), "utf8");
    await fs.writeFile(
      indexWxss,
      `${baseWxss}\n${emitEntityListIndexWxss()}`,
      "utf8"
    );
    await fs.writeFile(
      indexJson,
      patchIndexJsonTitle(
        await fs.readFile(indexJson, "utf8"),
        listScreen.title
      ),
      "utf8"
    );
  } else if (listScreen) {
    const indexWxml = path.join(appDir, "pages/index/index.wxml");
    const indexJson = path.join(appDir, "pages/index/index.json");
    await fs.writeFile(
      indexWxml,
      patchIndexWxml(await fs.readFile(indexWxml, "utf8"), listScreen.title),
      "utf8"
    );
    await fs.writeFile(
      indexJson,
      patchIndexJsonTitle(
        await fs.readFile(indexJson, "utf8"),
        listScreen.title
      ),
      "utf8"
    );
  }

  for (const screen of resolveCodegenScreens(spec)) {
    await ensureGeneratedPage(appDir, screen, industry);
  }

  // Form 页面：为 form 类型的 screen 和没有专门列表的添加表单入口
  const formScreens = spec.screens.filter((s) => s.type === "form");
  for (const screen of formScreens) {
    const safe = screen.id.replace(/[^a-z0-9_]/gi, "_").toLowerCase() || "form";
    const formDir = path.join(appDir, "pages", safe);
    await fs.mkdir(formDir, { recursive: true });
    const { emitWechatFormPage } = await import("./emit-form");
    const form = emitWechatFormPage(screen, spec);
    await fs.writeFile(path.join(formDir, `${safe}.wxml`), form.wxml, "utf8");
    await fs.writeFile(path.join(formDir, `${safe}.js`), form.js, "utf8");
    await fs.writeFile(path.join(formDir, `${safe}.json`), '{"usingComponents":{"privacy-popup":"../../components/privacy-popup/privacy-popup"}}\n', "utf8");
    await fs.writeFile(path.join(formDir, `${safe}.wxss`), form.wxss, "utf8");
    // 注册到 app.json
    const pagePath = `pages/${safe}/${safe}`;
    if (!appJson.pages.includes(pagePath)) {
      appJson.pages.push(pagePath);
    }
  }

  // Auth 页面
  const { emitWechatLoginPage, emitWechatRegisterPage } = await import("./emit-auth");
  const loginDir = path.join(appDir, "pages", "login");
  const registerDir = path.join(appDir, "pages", "register");
  await fs.mkdir(loginDir, { recursive: true });
  await fs.mkdir(registerDir, { recursive: true });

  const login = emitWechatLoginPage(spec.displayName);
  await fs.writeFile(path.join(loginDir, "login.wxml"), login.wxml, "utf8");
  await fs.writeFile(path.join(loginDir, "login.js"), login.js, "utf8");
  await fs.writeFile(path.join(loginDir, "login.json"), '{"usingComponents":{"privacy-popup":"../../components/privacy-popup/privacy-popup"}}\n', "utf8");
  await fs.writeFile(path.join(loginDir, "login.wxss"), login.wxss, "utf8");

  const register = emitWechatRegisterPage(spec.displayName);
  await fs.writeFile(path.join(registerDir, "register.wxml"), register.wxml, "utf8");
  await fs.writeFile(path.join(registerDir, "register.js"), register.js, "utf8");
  await fs.writeFile(path.join(registerDir, "register.json"), '{"usingComponents":{"privacy-popup":"../../components/privacy-popup/privacy-popup"}}\n', "utf8");
  await fs.writeFile(path.join(registerDir, "register.wxss"), register.wxss, "utf8");

  if (!appJson.pages.includes("pages/login/login")) appJson.pages.push("pages/login/login");
  if (!appJson.pages.includes("pages/register/register")) appJson.pages.push("pages/register/register");

  // 写回 app.json（含新增 page）
  await fs.writeFile(appJsonPath, JSON.stringify(appJson, null, 2) + "\n", "utf8");

  return {
    outputDir: appDir,
    appName: spec.appName,
    displayName: spec.displayName
  };
}

export async function generateWechatZip(specInput: unknown): Promise<{
  buffer: Buffer;
  fileName: string;
  displayName: string;
}> {
  const { outputDir, appName, displayName } =
    await generateWechatProject(specInput);
  try {
    const buffer = await zipDirectory(outputDir);
    return {
      buffer,
      fileName: `${appName}-wechat.zip`,
      displayName
    };
  } finally {
    await fs.rm(path.dirname(outputDir), { recursive: true, force: true });
  }
}
