import fs from "fs/promises";
import path from "path";
import os from "os";

import type { AppSpec } from "@/lib/app-spec/types";
import { validateAppSpec } from "@/lib/app-spec/validate";
import { zipDirectory } from "@/lib/flutter-codegen/zip";
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
import { resolveTabScreens } from "@/lib/app-spec/resolve-tabs";

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
  screen: { id: string; title: string }
): Promise<void> {
  const pagePath = wechatPagePath(screen.id);
  if (pagePath === "pages/index/index" || pagePath === "pages/profile/profile") {
    return;
  }
  const [, pageId, fileName] = pagePath.split("/");
  const fileBase = path.join(appDir, "pages", pageId, fileName);
  await fs.mkdir(path.dirname(fileBase), { recursive: true });
  await fs.writeFile(`${fileBase}.wxml`, emitGeneratedPageWxml(screen), "utf8");
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
  if (listScreen) {
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

  for (const screen of resolveTabScreens(spec)) {
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
