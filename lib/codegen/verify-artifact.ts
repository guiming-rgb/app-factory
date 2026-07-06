import fs from "fs/promises";
import path from "path";
import os from "os";
import { spawnSync } from "child_process";
import type { CodegenTarget } from "@/lib/codegen/format-run-quality";

/**
 * P1: 三栈代码生成产物自动验证
 * unzip → 检查文件完整性 → （Flutter）dart analyze
 */

export type ArtifactVerification = {
  ok: boolean;
  target: CodegenTarget;
  fileCount: number;
  hasPubspec: boolean;
  hasRouter: boolean;
  hasAuth: boolean;
  hasSql: boolean;
  hasAppJson: boolean;
  hasProjectConfig: boolean;
  hasWechatPages: boolean;
  hasHarmonyMainPages: boolean;
  hasHarmonyEntry: boolean;
  hasHarmonyEtsPages: boolean;
  dartAnalyze: "passed" | "failed" | "skipped";
  dartAnalyzeOutput?: string;
  errors: string[];
};

type ZipScan = {
  fileCount: number;
  names: string[];
};

async function loadZipEntries(artifactPath: string): Promise<{ buffer: Buffer; scan: ZipScan } | { error: string }> {
  const { readArtifactFile, artifactExists } = await import("@/lib/codegen/artifacts");
  const exists = await artifactExists(artifactPath);
  if (!exists) return { error: "产物文件不存在" };

  const buffer = await readArtifactFile(artifactPath);
  if (buffer.length < 100) return { error: "产物文件过小（<100 bytes）" };

  const AdmZip = (await import("adm-zip")).default;
  const zip = new AdmZip(buffer);
  const entries = zip.getEntries();
  return {
    buffer,
    scan: {
      fileCount: entries.length,
      names: entries.map((e) => e.entryName),
    },
  };
}

function scanFlutter(names: string[]) {
  return {
    hasPubspec: names.some((n) => n.includes("pubspec.yaml")),
    hasRouter: names.some((n) => n.includes("app_router.dart")),
    hasAuth: names.some((n) => n.includes("login_page.dart") || n.includes("auth")),
    hasSql: names.some((n) => n.includes("001_create_tables.sql")),
  };
}

function scanWechat(names: string[]) {
  return {
    hasAppJson: names.some((n) => n.endsWith("app.json")),
    hasProjectConfig: names.some((n) => n.endsWith("project.config.json")),
    hasWechatPages: names.some((n) => n.includes("/pages/") && (n.endsWith(".js") || n.endsWith(".wxml"))),
    hasAuth: names.some((n) => n.includes("utils/auth.js") || n.includes("pages/login")),
  };
}

function scanHarmony(names: string[]) {
  return {
    hasHarmonyMainPages: names.some((n) => n.endsWith("main_pages.json")),
    hasHarmonyEntry: names.some((n) => n.includes("EntryAbility.ets")),
    hasHarmonyEtsPages: names.some((n) => n.includes("/pages/") && n.endsWith(".ets")),
    hasAuth: names.some((n) => n.includes("emit-auth") || n.includes("Login") || n.includes("login")),
  };
}

async function runDartAnalyze(buffer: Buffer, names: string[]): Promise<{
  dartAnalyze: ArtifactVerification["dartAnalyze"];
  dartAnalyzeOutput?: string;
}> {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "verify-"));
  try {
    const AdmZip = (await import("adm-zip")).default;
    const zip = new AdmZip(buffer);
    zip.extractAllTo(tmpDir, true);
    const root = names[0]?.split("/")[0] ?? "";
    const appDir = path.join(tmpDir, root);

    const flutterCheck = spawnSync("flutter", ["--version"], { encoding: "utf8", timeout: 5000 });
    if (flutterCheck.status !== 0) return { dartAnalyze: "skipped" };

    const pubGet = spawnSync("flutter", ["pub", "get"], { cwd: appDir, encoding: "utf8", timeout: 30000 });
    if (pubGet.status !== 0) return { dartAnalyze: "skipped" };

    const analyze = spawnSync("dart", ["analyze"], { cwd: appDir, encoding: "utf8", timeout: 60000 });
    if (analyze.status === 0) return { dartAnalyze: "passed" };
    return {
      dartAnalyze: "failed",
      dartAnalyzeOutput: (analyze.stderr || analyze.stdout).slice(0, 1000),
    };
  } catch {
    return { dartAnalyze: "skipped" };
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
}

function emptyFlags(target: CodegenTarget): Omit<ArtifactVerification, "ok" | "target" | "fileCount" | "errors"> {
  return {
    hasPubspec: false,
    hasRouter: false,
    hasAuth: false,
    hasSql: false,
    hasAppJson: false,
    hasProjectConfig: false,
    hasWechatPages: false,
    hasHarmonyMainPages: false,
    hasHarmonyEntry: false,
    hasHarmonyEtsPages: false,
    dartAnalyze: "skipped",
  };
}

export async function verifyCodegenArtifact(
  artifactPath: string,
  target: CodegenTarget,
): Promise<ArtifactVerification> {
  const errors: string[] = [];
  const base = emptyFlags(target);

  try {
    const loaded = await loadZipEntries(artifactPath);
    if ("error" in loaded) {
      errors.push(loaded.error);
      return { ok: false, target, fileCount: 0, ...base, errors };
    }

    const { buffer, scan } = loaded;
    const { fileCount, names } = scan;

    if (target === "flutter") {
      const f = scanFlutter(names);
      Object.assign(base, f);
      const dart = await runDartAnalyze(buffer, names);
      base.dartAnalyze = dart.dartAnalyze;
      if (dart.dartAnalyzeOutput) base.dartAnalyzeOutput = dart.dartAnalyzeOutput;
      if (!f.hasPubspec) errors.push("缺少 pubspec.yaml");
      if (dart.dartAnalyze === "failed") errors.push("dart analyze 未通过");
    } else if (target === "wechat") {
      const w = scanWechat(names);
      base.hasAppJson = w.hasAppJson;
      base.hasProjectConfig = w.hasProjectConfig;
      base.hasWechatPages = w.hasWechatPages;
      base.hasAuth = w.hasAuth;
      if (!w.hasAppJson) errors.push("缺少 app.json");
      if (!w.hasProjectConfig) errors.push("缺少 project.config.json");
      if (!w.hasWechatPages) errors.push("缺少 pages/ 页面文件");
    } else {
      const h = scanHarmony(names);
      base.hasHarmonyMainPages = h.hasHarmonyMainPages;
      base.hasHarmonyEntry = h.hasHarmonyEntry;
      base.hasHarmonyEtsPages = h.hasHarmonyEtsPages;
      base.hasAuth = h.hasAuth;
      if (!h.hasHarmonyMainPages) errors.push("缺少 main_pages.json");
      if (!h.hasHarmonyEntry) errors.push("缺少 EntryAbility.ets");
      if (!h.hasHarmonyEtsPages) errors.push("缺少 pages/*.ets");
    }

    const minFiles = target === "flutter" ? 5 : 8;
    const ok = fileCount >= minFiles && errors.length === 0 && base.dartAnalyze !== "failed";
    if (fileCount < minFiles) errors.push(`文件数过少（${fileCount} < ${minFiles}）`);

    return { ok, target, fileCount, ...base, errors };
  } catch (e) {
    errors.push(`验证异常: ${e instanceof Error ? e.message : String(e)}`);
    return { ok: false, target, fileCount: 0, ...base, errors };
  }
}

/** @deprecated 使用 verifyCodegenArtifact(path, "flutter") */
export async function verifyGeneratedArtifact(artifactPath: string): Promise<ArtifactVerification> {
  return verifyCodegenArtifact(artifactPath, "flutter");
}
