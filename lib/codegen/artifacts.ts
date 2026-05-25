import fs from "fs/promises";
import path from "path";
import os from "os";

import {
  codegenArtifactInStorage,
  downloadCodegenArtifact,
  uploadCodegenArtifact
} from "@/lib/codegen/storage";

const ARTIFACTS_ROOT = path.join(os.tmpdir(), "app-factory-artifacts");

export function resolveArtifactPath(relativePath: string): string {
  const normalized = relativePath.replace(/^\/+/, "");
  const full = path.join(ARTIFACTS_ROOT, normalized);
  if (!full.startsWith(ARTIFACTS_ROOT)) {
    throw new Error("非法 artifact 路径");
  }
  return full;
}

export async function writeArtifactFile(
  runId: string,
  fileName: string,
  buffer: Buffer
): Promise<{ relativePath: string; storageUploaded: boolean }> {
  const relative = `${runId}/${fileName}`;
  const full = resolveArtifactPath(relative);
  await fs.mkdir(path.dirname(full), { recursive: true });
  await fs.writeFile(full, buffer);

  let storageUploaded = false;
  try {
    await uploadCodegenArtifact(relative, buffer);
    storageUploaded = true;
  } catch (err) {
    console.warn("[writeArtifactFile] Storage upload skipped:", err);
  }

  return { relativePath: relative, storageUploaded };
}

export async function readArtifactFile(
  relativePath: string
): Promise<Buffer> {
  try {
    return await fs.readFile(resolveArtifactPath(relativePath));
  } catch {
    const fromStorage = await downloadCodegenArtifact(relativePath);
    if (fromStorage) {
      return fromStorage;
    }
    throw new Error("产物文件不存在");
  }
}

export async function artifactExists(relativePath: string): Promise<boolean> {
  try {
    await fs.access(resolveArtifactPath(relativePath));
    return true;
  } catch {
    return codegenArtifactInStorage(relativePath);
  }
}

export async function writePreviewHtml(
  runId: string,
  html: string
): Promise<string> {
  const relative = `${runId}/preview/index.html`;
  const full = resolveArtifactPath(relative);
  await fs.mkdir(path.dirname(full), { recursive: true });
  const buffer = Buffer.from(html, "utf8");
  await fs.writeFile(full, buffer);

  try {
    await uploadCodegenArtifact(relative, buffer, {
      contentType: "text/html; charset=utf-8"
    });
  } catch (err) {
    console.warn("[writePreviewHtml] Storage upload skipped:", err);
  }

  return relative;
}

export async function readPreviewHtml(relativePath: string): Promise<string> {
  const buffer = await readArtifactFile(relativePath);
  return buffer.toString("utf8");
}
