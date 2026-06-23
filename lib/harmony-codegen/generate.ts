import fs from "fs/promises";
import path from "path";
import os from "os";

import { countCodegenScreens } from "@/lib/app-spec/resolve-codegen-screens";
import type { AppSpec } from "@/lib/app-spec/types";
import { validateAppSpec } from "@/lib/app-spec/validate";
import { resolveCodegenScreens } from "@/lib/app-spec/resolve-codegen-screens";
import { zipDirectory } from "@/lib/flutter-codegen/zip";
import {
  buildHarmonyMainPagesJson,
  emitHarmonyPageEts,
  findEntityListScreen,
  harmonyPageComponentName
} from "./emit";
import {
  emitHarmonyEntityDetailEts,
  HARMONY_ENTITY_DETAIL_COMPONENT
} from "./emit-entity-detail";
import { resolveEntityForScreen } from "@/lib/app-spec/entity-scaffold";
import { resolveHarmonySupabaseForCodegen } from "./supabase-env";

const TEMPLATE_DIR = path.join(process.cwd(), "templates", "harmony-minimal");

function harmonyBundleName(appName: string): string {
  const slug = appName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
  return slug || "app_factory";
}

async function copyTemplate(destDir: string): Promise<void> {
  await fs.cp(TEMPLATE_DIR, destDir, { recursive: true });
}

async function emitHarmonyScreens(
  appDir: string,
  spec: AppSpec
): Promise<number> {
  const screens = resolveCodegenScreens(spec);
  const pagesDir = path.join(appDir, "entry/src/main/ets/pages");

  for (let i = 0; i < screens.length; i++) {
    const screen = screens[i];
    const componentName = harmonyPageComponentName(screen.id, i);
    const filePath = path.join(pagesDir, `${componentName}.ets`);

    // 扩展页面类型路由
    if (screen.type === "dashboard" || screen.type === "card_grid" || screen.type === "calendar") {
      const ext = await import("./emit-extended");
      let content: string;
      if (screen.type === "dashboard") content = ext.emitHarmonyDashboard(screen, spec);
      else if (screen.type === "card_grid") content = ext.emitHarmonyCardGrid(screen, spec);
      else content = ext.emitHarmonyCalendar(screen, spec);
      await fs.writeFile(filePath, content, "utf8");
    } else {
      await fs.writeFile(
        filePath,
        emitHarmonyPageEts(screen, componentName, {
          entry: i === 0,
          spec
        }),
        "utf8"
      );
    }
  }

  const mainPagesPath = path.join(
    appDir,
    "entry/src/main/resources/base/profile/main_pages.json"
  );
  await fs.writeFile(mainPagesPath, buildHarmonyMainPagesJson(spec), "utf8");

  return screens.length;
}

export type HarmonyCodegenResult = {
  outputDir: string;
  appName: string;
  displayName: string;
  bundleName: string;
  screenCount: number;
};

export async function generateHarmonyProject(
  specInput: unknown
): Promise<HarmonyCodegenResult> {
  const validation = validateAppSpec(specInput);
  if (!validation.ok) {
    throw new Error(`App Spec 校验失败：${validation.errors.join("; ")}`);
  }
  const spec = validation.spec;
  const bundleName = harmonyBundleName(spec.appName);

  const outRoot = await fs.mkdtemp(path.join(os.tmpdir(), "app-factory-harmony-"));
  const appDir = path.join(outRoot, bundleName);
  await copyTemplate(appDir);

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
    `# Supabase 后端配置\n\n本目录包含 App 生产工厂自动生成的数据库迁移脚本。\n\n## 表结构\n\n${ddl.tableNames.length ? ddl.tableNames.map((t) => `- **${t}**`).join("\n") : "（无）"}\n`,
    "utf8"
  );

  const limitations = spec.limitations?.length
    ? spec.limitations.map((l) => `- ${l}`).join("\n")
    : "- （无）";
  const screenCount = countCodegenScreens(spec);
  const { url: sbUrl, anonKey: sbKey } = resolveHarmonySupabaseForCodegen();
  const supabaseNote =
    sbUrl && sbKey
      ? "- Supabase：已从工厂环境注入 URL/anon key（DevEco 需网络与表 RLS）\n"
      : "- Supabase：未注入（工厂缺 NEXT_PUBLIC_SUPABASE_* 时仅用列表示例行）\n";

  await fs.writeFile(
    path.join(appDir, "LIMITATIONS.md"),
    `# Harmony 生成说明\n\n- displayName: ${spec.displayName}\n- bundleName: ${bundleName}\n- screens: ${screenCount}\n- generatedAt: ${new Date().toISOString()}\n${supabaseNote}\n## 在鸿蒙系统上运行\n\n1. 用 DevEco Studio 打开本工程根目录（含 entry、AppScope）\n2. 连接鸿蒙手机或启动鸿蒙模拟器\n3. 点击 Run 安装到设备\n4. 需网络时确认设备可访问 Supabase（工厂已注入常量时直连 REST）\n\n## limitations\n\n${limitations}\n`,
    "utf8"
  );

  const appScopePath = path.join(appDir, "AppScope", "app.json5");
  let appScope = await fs.readFile(appScopePath, "utf8");
  appScope = appScope.replace(
    /"bundleName":\s*"[^"]*"/,
    `"bundleName": "com.appfactory.${bundleName}"`
  );
  appScope = appScope.replace(
    /"label":\s*"\$string:app_name"/,
    `"label": "${spec.displayName.replace(/"/g, '\\"')}"`
  );
  await fs.writeFile(appScopePath, appScope, "utf8");

  // 注入 Supabase 配置
  const { url: sbUrl2, anonKey: sbKey2 } = resolveHarmonySupabaseForCodegen();
  const supabaseConfigPath = path.join(appDir, "entry/src/main/ets/utils/SupabaseConfig.ets");
  let supabaseConfig = await fs.readFile(supabaseConfigPath, "utf8");
  supabaseConfig = supabaseConfig
    .replace("__SUPABASE_URL__", sbUrl2 || "")
    .replace("__SUPABASE_ANON_KEY__", sbKey2 || "");
  await fs.writeFile(supabaseConfigPath, supabaseConfig, "utf8");

  // 替换 Index.ets 模板占位符
  const indexPath = path.join(appDir, "entry/src/main/ets/pages/Index.ets");
  let indexContent = await fs.readFile(indexPath, "utf8");
  indexContent = indexContent.replace(/__DISPLAY_NAME__/g, spec.displayName);
  await fs.writeFile(indexPath, indexContent, "utf8");

  const emitted = await emitHarmonyScreens(appDir, spec);

  const listScreen = findEntityListScreen(spec);
  if (listScreen) {
    const entity = resolveEntityForScreen(spec, listScreen);
    if (entity) {
      const pagesDir = path.join(appDir, "entry/src/main/ets/pages");
      await fs.writeFile(
        path.join(pagesDir, `${HARMONY_ENTITY_DETAIL_COMPONENT}.ets`),
        emitHarmonyEntityDetailEts(entity),
        "utf8"
      );
    }
  }

  // Auth 页面
  const { emitHarmonyLoginPage, emitHarmonyRegisterPage } = await import("./emit-auth");
  const pagesDir = path.join(appDir, "entry/src/main/ets/pages");
  await fs.writeFile(
    path.join(pagesDir, "Login.ets"),
    emitHarmonyLoginPage(spec.displayName),
    "utf8"
  );
  await fs.writeFile(
    path.join(pagesDir, "Register.ets"),
    emitHarmonyRegisterPage(spec.displayName),
    "utf8"
  );

  // Form 页面（为 form 类型的 screen 生成）
  const formScreens = spec.screens.filter((s) => s.type === "form");
  for (const screen of formScreens) {
    const { emitHarmonyFormPage } = await import("./emit-form");
    const componentName = harmonyPageComponentName(screen.id, formScreens.indexOf(screen) + 100);
    await fs.writeFile(
      path.join(pagesDir, `${componentName}.ets`),
      emitHarmonyFormPage(screen, spec),
      "utf8"
    );
  }

  // 更新 main_pages.json（添加 auth 和 form 页面）
  const mainPagesPath = path.join(appDir, "entry/src/main/resources/base/profile/main_pages.json");
  const existingPages = JSON.parse(await fs.readFile(mainPagesPath, "utf8")) as { src: string[] };
  const extraRoutes = ["pages/Login", "pages/Register"];
  for (const screen of formScreens) {
    const componentName = harmonyPageComponentName(screen.id, formScreens.indexOf(screen) + 100);
    extraRoutes.push(`pages/${componentName}`);
  }
  for (const route of extraRoutes) {
    if (!existingPages.src.includes(route)) {
      existingPages.src.push(route);
    }
  }
  await fs.writeFile(mainPagesPath, JSON.stringify(existingPages, null, 2) + "\n", "utf8");

  return {
    outputDir: appDir,
    appName: spec.appName,
    displayName: spec.displayName,
    bundleName,
    screenCount: emitted
  };
}

export async function generateHarmonyZip(specInput: unknown): Promise<{
  buffer: Buffer;
  fileName: string;
  displayName: string;
}> {
  const { outputDir, appName, displayName, bundleName } =
    await generateHarmonyProject(specInput);
  try {
    const buffer = await zipDirectory(outputDir);
    return {
      buffer,
      fileName: `${bundleName || appName}-harmony.zip`,
      displayName
    };
  } finally {
    await fs.rm(path.dirname(outputDir), { recursive: true, force: true });
  }
}
