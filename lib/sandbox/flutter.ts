import { execSync, spawnSync } from "child_process";
import fs from "fs/promises";
import path from "path";

import { generateFlutterProject } from "@/lib/flutter-codegen/generate";
import { validateAppSpec } from "@/lib/app-spec/validate";
import type { AppSpec } from "@/lib/app-spec/types";
import { hasFlutter } from "@/lib/utils/has-flutter";

export { hasFlutter };

export const DEFAULT_SPEC_PATH = path.join(
  process.cwd(),
  "docs/schemas/examples/valid-minimal.json"
);
export const DEFAULT_HOST_OUT = "/tmp/app-factory-sandbox-flutter";
export const DEFAULT_DOCKER_OUT = "/tmp/app-factory-sandbox-flutter-docker";
export const DOCKER_IMAGE = "app-factory-flutter-sandbox:stable";
export const DOCKERFILE_DIR = path.join(
  process.cwd(),
  "docker",
  "flutter-sandbox"
);

export function hasDocker(): boolean {
  const r = spawnSync("docker", ["version"], { stdio: "ignore" });
  return r.status === 0;
}

export async function loadSpecFromFile(
  specPath: string = DEFAULT_SPEC_PATH
): Promise<AppSpec> {
  const spec = JSON.parse(await fs.readFile(specPath, "utf8"));
  const validation = validateAppSpec(spec);
  if (!validation.ok) {
    throw new Error(`Spec 无效：${validation.errors.join("; ")}`);
  }
  return validation.spec;
}

/** 生成沙箱工程到 outDir（会清空目录） */
export async function prepareSandboxOutput(options: {
  specPath?: string;
  outDir: string;
}): Promise<{ outDir: string; appName: string }> {
  const spec = await loadSpecFromFile(options.specPath);
  const outDir = options.outDir;
  await fs.rm(outDir, { recursive: true, force: true }).catch(() => {});
  const { outputDir, appName } = await generateFlutterProject(spec);
  await fs.cp(outputDir, outDir, { recursive: true });
  await fs.rm(path.dirname(outputDir), { recursive: true, force: true });
  return { outDir, appName };
}

export function runFlutterPubGetAndAnalyze(cwd: string): void {
  console.log("📦 flutter pub get …");
  execSync("flutter pub get", { cwd, stdio: "inherit" });
  console.log("\n🔍 dart analyze …");
  execSync("dart analyze", { cwd, stdio: "inherit" });
  console.log("✅ dart analyze 通过");
}

export function runFlutterApkDebugBuild(
  cwd: string,
  timeoutMs = 300_000
): void {
  console.log("\n🏗 flutter build apk --debug …");
  execSync("flutter build apk --debug", {
    cwd,
    stdio: "inherit",
    timeout: timeoutMs
  });
  console.log("✅ flutter build apk 通过");
}

export function ensureDockerImage(options?: {
  rebuild?: boolean;
  image?: string;
}): void {
  const image = options?.image ?? DOCKER_IMAGE;
  if (!options?.rebuild) {
    const inspect = spawnSync(
      "docker",
      ["image", "inspect", image],
      { stdio: "ignore" }
    );
    if (inspect.status === 0) return;
  }
  console.log(`🐳 docker build ${image} …`);
  execSync(`docker build -t ${image} ${DOCKERFILE_DIR}`, {
    stdio: "inherit"
  });
}

export function runDockerFlutterGate(options: {
  outDir: string;
  noBuild?: boolean;
  image?: string;
}): void {
  const image = options.image ?? DOCKER_IMAGE;
  const mount = `${options.outDir}:/workspace`;
  const analyzeCmd =
    "flutter pub get && dart analyze && echo '✅ docker dart analyze 通过'";
  console.log(`\n🐳 docker run (${image}) …`);
  execSync(
    `docker run --rm -v "${mount}" -w /workspace ${image} bash -lc ${JSON.stringify(analyzeCmd)}`,
    { stdio: "inherit" }
  );

  if (!options.noBuild) {
    const buildCmd =
      "flutter build apk --debug && echo '✅ docker flutter build apk 通过'";
    console.log("\n🐳 docker build apk --debug …");
    try {
      execSync(
        `docker run --rm -v "${mount}" -w /workspace ${image} bash -lc ${JSON.stringify(buildCmd)}`,
        { stdio: "inherit", timeout: 600_000 }
      );
    } catch {
      throw new Error("docker flutter build apk 未通过或超时");
    }
  }
}
