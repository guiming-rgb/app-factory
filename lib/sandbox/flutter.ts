import { execSync, spawnSync } from "child_process";
import path from "path";

import { hasFlutter } from "@/lib/utils/has-flutter";

export { hasFlutter };

// loadSpecFromFile + prepareSandboxOutput moved to lib/flutter-codegen/generate.ts
// to break the sandbox ↔ flutter-codegen dependency cycle.

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

const SANDBOX_CMD_TIMEOUT_MS = 120_000;

export function hasDocker(): boolean {
  const r = spawnSync("docker", ["version"], {
    stdio: "ignore",
    timeout: SANDBOX_CMD_TIMEOUT_MS,
  });
  return r.status === 0;
}

export function runFlutterPubGetAndAnalyze(cwd: string): void {
  console.log("📦 flutter pub get …");
  execSync("flutter pub get", {
    cwd,
    stdio: "inherit",
    timeout: SANDBOX_CMD_TIMEOUT_MS,
  });
  console.log("\n🔍 dart analyze …");
  execSync("dart analyze", {
    cwd,
    stdio: "inherit",
    timeout: SANDBOX_CMD_TIMEOUT_MS,
  });
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
      { stdio: "ignore", timeout: SANDBOX_CMD_TIMEOUT_MS },
    );
    if (inspect.status === 0) return;
  }
  console.log(`🐳 docker build ${image} …`);
  execSync(`docker build -t ${image} ${DOCKERFILE_DIR}`, {
    stdio: "inherit",
    timeout: SANDBOX_CMD_TIMEOUT_MS,
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
    { stdio: "inherit", timeout: SANDBOX_CMD_TIMEOUT_MS },
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
