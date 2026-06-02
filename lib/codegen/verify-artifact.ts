import fs from "fs/promises";
import path from "path";
import os from "os";
import { spawnSync } from "child_process";
import { zipDirectory } from "@/lib/flutter-codegen/zip";

/**
 * P0-1: 代码生成产物自动验证
 * unzip → 检查文件完整性 → dart analyze → 评分归档
 */

export type ArtifactVerification = {
  ok: boolean;
  fileCount: number;
  hasPubspec: boolean;
  hasRouter: boolean;
  hasAuth: boolean;
  hasSql: boolean;
  dartAnalyze: "passed" | "failed" | "skipped";
  dartAnalyzeOutput?: string;
  errors: string[];
};

export async function verifyGeneratedArtifact(
  artifactPath: string
): Promise<ArtifactVerification> {
  const errors: string[] = [];
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "verify-"));
  let fileCount = 0;
  let hasPubspec = false, hasRouter = false, hasAuth = false, hasSql = false;
  let dartAnalyze: ArtifactVerification["dartAnalyze"] = "skipped";
  let dartAnalyzeOutput: string | undefined;

  try {
    // 检查文件存在
    const { readArtifactFile, artifactExists } = await import("@/lib/codegen/artifacts");
    const exists = await artifactExists(artifactPath);
    if (!exists) { errors.push("产物文件不存在"); return { ok: false, fileCount: 0, hasPubspec: false, hasRouter: false, hasAuth: false, hasSql: false, dartAnalyze: "skipped", errors }; }

    // 如果是 ZIP，解压验证
    const buffer = await readArtifactFile(artifactPath);
    // 简单检查：文件大小 > 0
    if (buffer.length < 100) { errors.push("产物文件过小（<100 bytes）"); return { ok: false, fileCount: 0, hasPubspec: false, hasRouter: false, hasAuth: false, hasSql: false, dartAnalyze: "skipped", errors }; }

    // 尝试 unzip 验证
    const AdmZip = (await import("adm-zip")).default;
    const zip = new AdmZip(buffer);
    const entries = zip.getEntries();
    fileCount = entries.length;

    for (const entry of entries) {
      const name = entry.entryName;
      if (name.includes("pubspec.yaml")) hasPubspec = true;
      if (name.includes("app_router.dart")) hasRouter = true;
      if (name.includes("login_page.dart") || name.includes("auth")) hasAuth = true;
      if (name.includes("001_create_tables.sql")) hasSql = true;
    }

    // 提取到临时目录跑 dart analyze
    zip.extractAllTo(tmpDir, true);
    const appDir = path.join(tmpDir, entries[0]?.entryName.split("/")[0] ?? "");

    const flutterCheck = spawnSync("flutter", ["--version"], { encoding: "utf8", timeout: 5000 });
    if (flutterCheck.status === 0) {
      try {
        const pubGet = spawnSync("flutter", ["pub", "get"], { cwd: appDir, encoding: "utf8", timeout: 30000 });
        if (pubGet.status === 0) {
          const analyze = spawnSync("dart", ["analyze"], { cwd: appDir, encoding: "utf8", timeout: 60000 });
          dartAnalyze = analyze.status === 0 ? "passed" : "failed";
          if (analyze.status !== 0) dartAnalyzeOutput = (analyze.stderr || analyze.stdout).slice(0, 1000);
        }
      } catch { /* analyze optional */ }
    }
  } catch (e) {
    errors.push(`验证异常: ${e instanceof Error ? e.message : String(e)}`);
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }

  const ok = fileCount > 5 && errors.length === 0;
  return { ok, fileCount, hasPubspec, hasRouter, hasAuth, hasSql, dartAnalyze, dartAnalyzeOutput, errors };
}
