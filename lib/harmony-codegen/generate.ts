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
    await fs.writeFile(
      filePath,
      emitHarmonyPageEts(screen, componentName, {
        entry: i === 0,
        spec
      }),
      "utf8"
    );
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
