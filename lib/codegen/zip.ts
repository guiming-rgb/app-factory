/**
 * ZIP 工具 — 共享于三栈 codegen
 *
 * 从 lib/flutter-codegen/zip.ts 迁移至此，消除 wechat-codegen/harmony-codegen
 * 对 flutter-codegen 的不必要依赖。
 */
import AdmZip from "adm-zip";
import fs from "fs/promises";
import path from "path";

async function addDirectoryToZip(
  zip: AdmZip,
  dir: string,
  zipPath: string
): Promise<void> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const entryZipPath = zipPath ? `${zipPath}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      await addDirectoryToZip(zip, fullPath, entryZipPath);
    } else if (entry.isFile()) {
      const data = await fs.readFile(fullPath);
      zip.addFile(entryZipPath.replace(/\\/g, "/"), data);
    }
  }
}

/** 纯 JS 打包目录，Vercel/serverless 无系统 zip 时可用 */
export async function zipDirectory(sourceDir: string): Promise<Buffer> {
  const zip = new AdmZip();
  await addDirectoryToZip(zip, sourceDir, "");
  return zip.toBuffer();
}
