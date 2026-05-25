import { execSync, spawnSync } from "child_process";

import {
  DOCKER_IMAGE,
  ensureDockerImage,
  hasDocker
} from "@/lib/sandbox/flutter";

export type DockerAnalyzeStatus = "passed" | "failed" | "skipped";

export type DockerAnalyzeResult = {
  status: DockerAnalyzeStatus;
  reason?: string;
  output?: string;
};

function isAnalyzeDisabled(): boolean {
  return process.env.CODEGEN_DOCKER_ANALYZE_DISABLED === "1";
}

function captureExecError(err: unknown): string {
  if (err && typeof err === "object") {
    const e = err as { stdout?: Buffer | string; stderr?: Buffer | string; message?: string };
    const parts = [
      e.stdout?.toString?.() ?? (typeof e.stdout === "string" ? e.stdout : ""),
      e.stderr?.toString?.() ?? (typeof e.stderr === "string" ? e.stderr : ""),
      e.message ?? ""
    ].filter(Boolean);
    if (parts.length) return parts.join("\n").slice(-4000);
  }
  return err instanceof Error ? err.message : String(err);
}

/** codegen 流水线用：对已生成的 Flutter 工程跑 Docker dart analyze（不 build apk） */
export function runDockerFlutterAnalyze(options: {
  outDir: string;
  image?: string;
}): DockerAnalyzeResult {
  if (isAnalyzeDisabled()) {
    return { status: "skipped", reason: "CODEGEN_DOCKER_ANALYZE_DISABLED=1" };
  }

  if (!hasDocker()) {
    return { status: "skipped", reason: "未检测到 docker" };
  }

  const image = options.image ?? DOCKER_IMAGE;
  const mount = `${options.outDir}:/workspace`;
  const analyzeCmd = "flutter pub get && dart analyze";

  try {
    ensureDockerImage({ image });
    const output = execSync(
      `docker run --rm -v "${mount}" -w /workspace ${image} bash -lc ${JSON.stringify(analyzeCmd)}`,
      {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
        timeout: 300_000
      }
    );
    return {
      status: "passed",
      output: output.slice(-2000)
    };
  } catch (err: unknown) {
    return {
      status: "failed",
      reason: "dart analyze 未通过",
      output: captureExecError(err)
    };
  }
}

/** 门禁：Docker 可用且 analyze 失败时返回 false */
export function shouldFailCodegenOnAnalyze(result: DockerAnalyzeResult): boolean {
  if (result.status !== "failed") return false;
  if (process.env.CODEGEN_DOCKER_ANALYZE_STRICT === "0") return false;
  return true;
}

export function probeDockerForCodegen(): boolean {
  if (isAnalyzeDisabled()) return false;
  return hasDocker() && spawnSync("docker", ["image", "inspect", DOCKER_IMAGE], { stdio: "ignore" }).status === 0;
}
