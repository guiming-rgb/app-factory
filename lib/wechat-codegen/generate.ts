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
import { zipDirectory } from "@/lib/flutter-codegen/zip";
import {
  emitEntityListIndexJs,
  emitEntityListIndexWxml,
  emitEntityListIndexWxss
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
  screen: AppSpecScreen
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
  await fs.writeFile(
    `${fileBase}.wxml`,
    emitGeneratedPageWxml(screen, specForPage),
    "utf8"
  );
  await fs.writeFile(`${fileBase}.js`, emitGeneratedPageJs(), "utf8");
  await fs.writeFile(`${fileBase}.json`, emitGeneratedPageJson(screen), "utf8");
  await fs.writeFile(`${fileBase}.wxss`, "", "utf8");
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

  const outRoot = await fs.mkdtemp(
    path.join(os.tmpdir(), "app-factory-wechat-")
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
  await fs.writeFile(
    appJsonPath,
    JSON.stringify(buildAppJson(spec, baseAppJson), null, 2) + "\n",
    "utf8"
  );

  const projPath = path.join(appDir, "project.config.json");
  const proj = await fs.readFile(projPath, "utf8");
  await fs.writeFile(
    projPath,
    patchProjectConfigName(proj, spec.appName, spec.displayName),
    "utf8"
  );

  const listScreen = listScreenFromSpec(spec);
  const todoMode = isTodoAppSpec(spec);
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
    await fs.writeFile(indexJs, emitEntityListIndexJs(spec, listScreen), "utf8");
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
    await ensureGeneratedPage(appDir, screen);
  }

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
