import fs from "fs/promises";
import path from "path";
import os from "os";

import type { AppSpec } from "@/lib/app-spec/types";
import { validateAppSpec } from "@/lib/app-spec/validate";
import {
  emitAppRouterDart,
  emitGeneratedListPage,
  emitGeneratedPlaceholderPage,
  pageWidgetRef,
  patchAppTitle,
  patchListPageTitle,
  patchPubspecName,
  resolveTabScreens
} from "./dart-emit";
import { zipDirectory } from "./zip";

const TEMPLATE_DIR = path.join(
  process.cwd(),
  "templates",
  "flutter-minimal"
);

const SKIP_DIR_NAMES = new Set([
  ".dart_tool",
  "build",
  ".git",
  "Pods",
  ".gradle"
]);

function shouldSkipCopy(relPath: string): boolean {
  const parts = relPath.split(path.sep);
  return parts.some((p) => SKIP_DIR_NAMES.has(p));
}

async function copyTemplate(destDir: string): Promise<void> {
  async function walk(src: string, dest: string, base: string) {
    const entries = await fs.readdir(src, { withFileTypes: true });
    await fs.mkdir(dest, { recursive: true });
    for (const ent of entries) {
      const rel = path.join(base, ent.name);
      if (shouldSkipCopy(rel)) continue;
      const from = path.join(src, ent.name);
      const to = path.join(dest, ent.name);
      if (ent.isDirectory()) {
        await walk(from, to, rel);
      } else if (ent.isFile()) {
        await fs.copyFile(from, to);
      }
    }
  }
  await walk(TEMPLATE_DIR, destDir, "");
}

export type FlutterCodegenResult = {
  outputDir: string;
  appName: string;
  displayName: string;
};

export async function generateFlutterProject(
  specInput: unknown,
  options?: { keepOutput?: boolean }
): Promise<FlutterCodegenResult> {
  const validation = validateAppSpec(specInput);
  if (!validation.ok) {
    throw new Error(`App Spec 校验失败：${validation.errors.join("; ")}`);
  }
  const spec = validation.spec;

  const outRoot = await fs.mkdtemp(
    path.join(os.tmpdir(), `app-factory-flutter-`)
  );
  const appDir = path.join(outRoot, spec.appName);
  await copyTemplate(appDir);

  await fs.writeFile(
    path.join(appDir, "app_spec.json"),
    JSON.stringify(spec, null, 2),
    "utf8"
  );

  const limitations = spec.limitations?.length
    ? spec.limitations.map((l) => `- ${l}`).join("\n")
    : "- （无）";
  await fs.writeFile(
    path.join(appDir, "LIMITATIONS.md"),
    `# 生成说明\n\n- displayName: ${spec.displayName}\n- sourceProjectId: ${spec.sourceProjectId ?? "—"}\n- generatedAt: ${new Date().toISOString()}\n\n## limitations\n\n${limitations}\n`,
    "utf8"
  );

  const pubspecPath = path.join(appDir, "pubspec.yaml");
  const pubspec = await fs.readFile(pubspecPath, "utf8");
  await fs.writeFile(
    pubspecPath,
    patchPubspecName(pubspec, spec.appName, spec.displayName),
    "utf8"
  );

  const appDartPath = path.join(appDir, "lib", "app.dart");
  const appDart = await fs.readFile(appDartPath, "utf8");
  await fs.writeFile(
    appDartPath,
    patchAppTitle(appDart, spec.displayName),
    "utf8"
  );

  const listScreen = spec.screens.find(
    (s) => s.id === "match_list" || s.id === "main_list"
  );
  if (listScreen) {
    const listPath = path.join(
      appDir,
      "lib",
      "features",
      "match_list",
      "presentation",
      "list_page.dart"
    );
    const listContent = await fs.readFile(listPath, "utf8");
    await fs.writeFile(
      listPath,
      patchListPageTitle(listContent, listScreen.title),
      "utf8"
    );
  }

  const generatedPagesDir = path.join(appDir, "lib", "generated", "pages");
  await fs.mkdir(generatedPagesDir, { recursive: true });

  for (const screen of resolveTabScreens(spec)) {
    const ref = pageWidgetRef(screen);
    if (!ref.needsGenerated) continue;
    const content =
      screen.type === "list"
        ? emitGeneratedListPage(screen)
        : emitGeneratedPlaceholderPage(screen);
    await fs.writeFile(
      path.join(generatedPagesDir, `${screen.id}_page.dart`),
      content,
      "utf8"
    );
  }

  const routerPath = path.join(appDir, "lib", "router", "app_router.dart");
  await fs.writeFile(routerPath, emitAppRouterDart(spec), "utf8");

  if (!options?.keepOutput) {
    // 调用方负责清理；默认保留供 zip/API 使用
  }

  return {
    outputDir: appDir,
    appName: spec.appName,
    displayName: spec.displayName
  };
}

export async function generateFlutterZip(specInput: unknown): Promise<{
  buffer: Buffer;
  fileName: string;
  displayName: string;
}> {
  const { outputDir, appName, displayName } =
    await generateFlutterProject(specInput);
  try {
    const buffer = await zipDirectory(outputDir);
    return {
      buffer,
      fileName: `${appName}-flutter.zip`,
      displayName
    };
  } finally {
    await fs.rm(path.dirname(outputDir), { recursive: true, force: true });
  }
}
