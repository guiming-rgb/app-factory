import AdmZip from "adm-zip";
import fs from "fs/promises";
import os from "os";
import path from "path";

export async function unzipArtifactToDirectory(
  zipBuffer: Buffer,
  label: string
): Promise<string> {
  const root = await fs.mkdtemp(
    path.join(os.tmpdir(), `app-factory-github-${label}-`)
  );
  const outDir = path.join(root, "src");
  await fs.mkdir(outDir, { recursive: true });

  const zip = new AdmZip(zipBuffer);
  zip.extractAllTo(outDir, true);

  const entries = await fs.readdir(outDir);
  if (entries.length === 1) {
    const only = path.join(outDir, entries[0]);
    const stat = await fs.stat(only);
    if (stat.isDirectory()) {
      return only;
    }
  }

  return outDir;
}

export async function listProjectFiles(
  rootDir: string,
  baseDir = rootDir
): Promise<Array<{ relativePath: string; fullPath: string }>> {
  const out: Array<{ relativePath: string; fullPath: string }> = [];
  const entries = await fs.readdir(baseDir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === ".git") {
      continue;
    }
    const fullPath = path.join(baseDir, entry.name);
    if (entry.isDirectory()) {
      out.push(...(await listProjectFiles(rootDir, fullPath)));
    } else if (entry.isFile()) {
      out.push({
        relativePath: path.relative(rootDir, fullPath).split(path.sep).join("/"),
        fullPath
      });
    }
  }
  return out;
}

export async function removeTempDirectory(dir: string) {
  const parent = path.dirname(dir);
  await fs
    .rm(parent.startsWith(os.tmpdir()) ? parent : dir, {
      recursive: true,
      force: true
    })
    .catch(() => {});
}
