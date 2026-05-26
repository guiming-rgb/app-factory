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
  attempts?: number;
};

function isAnalyzeDisabled(): boolean {
  return process.env.CODEGEN_DOCKER_ANALYZE_DISABLED === "1";
}

function getAnalyzeRetries(): number {
  const raw = process.env.CODEGEN_DOCKER_ANALYZE_RETRIES?.trim();
  const n = raw ? Number.parseInt(raw, 10) : 2;
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.min(n, 5);
}

function getAttemptTimeoutMs(): number {
  const raw = process.env.CODEGEN_DOCKER_ANALYZE_TIMEOUT_MS?.trim();
  const n = raw ? Number.parseInt(raw, 10) : 120_000;
  if (!Number.isFinite(n) || n < 30_000) return 120_000;
  return Math.min(n, 300_000);
}

function captureExecError(err: unknown): string {
  if (err && typeof err === "object") {
    const e = err as {
      stdout?: Buffer | string;
      stderr?: Buffer | string;
      message?: string;
    };
    const parts = [
      e.stdout?.toString?.() ?? (typeof e.stdout === "string" ? e.stdout : ""),
      e.stderr?.toString?.() ?? (typeof e.stderr === "string" ? e.stderr : ""),
      e.message ?? ""
    ].filter(Boolean);
    if (parts.length) return parts.join("\n").slice(-4000);
  }
  return err instanceof Error ? err.message : String(err);
}

function isRetryableAnalyzeError(message: string): boolean {
  return /ETIMEDOUT|timed out|timeout|ECONNRESET|spawnSync/i.test(message);
}

function runDockerAnalyzeOnce(options: {
  outDir: string;
  image: string;
  timeoutMs: number;
}): { ok: true; output: string } | { ok: false; message: string } {
  const mount = `${options.outDir}:/workspace`;
  const analyzeCmd = "flutter pub get && dart analyze";

  try {
    const output = execSync(
      `docker run --rm -v "${mount}" -w /workspace ${options.image} bash -lc ${JSON.stringify(analyzeCmd)}`,
      {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
        timeout: options.timeoutMs
      }
    );
    return { ok: true, output: output.slice(-2000) };
  } catch (err: unknown) {
    return { ok: false, message: captureExecError(err) };
  }
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
  const maxAttempts = getAnalyzeRetries();
  const timeoutMs = getAttemptTimeoutMs();
  let lastMessage = "";
  let attemptsUsed = 0;

  try {
    ensureDockerImage({ image });
  } catch (err: unknown) {
    return {
      status: "failed",
      reason: "Docker 镜像不可用",
      output: captureExecError(err),
      attempts: 1
    };
  }

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    attemptsUsed = attempt;
    const result = runDockerAnalyzeOnce({ outDir: options.outDir, image, timeoutMs });
    if (result.ok) {
      return {
        status: "passed",
        output: result.output,
        attempts: attempt
      };
    }

    lastMessage = result.message;
    const retryable =
      attempt < maxAttempts && isRetryableAnalyzeError(result.message);
    if (!retryable) {
      break;
    }

    const delaySec = Math.min(8, 2 * attempt);
    console.warn(
      `[runDockerFlutterAnalyze] attempt ${attempt}/${maxAttempts} retryable error, wait ${delaySec}s`
    );
    execSync(`sleep ${delaySec}`, { stdio: "ignore" });
  }

  return {
    status: "failed",
    reason: "dart analyze 未通过",
    output: lastMessage,
    attempts: attemptsUsed
  };
}

/** 门禁：Docker 可用且 analyze 失败时返回 false */
export function shouldFailCodegenOnAnalyze(result: DockerAnalyzeResult): boolean {
  if (result.status !== "failed") return false;
  if (process.env.CODEGEN_DOCKER_ANALYZE_STRICT === "0") return false;
  return true;
}

export function probeDockerForCodegen(): boolean {
  if (isAnalyzeDisabled()) return false;
  return (
    hasDocker() &&
    spawnSync("docker", ["image", "inspect", DOCKER_IMAGE], { stdio: "ignore" })
      .status === 0
  );
}
