import { execFile } from "child_process";
import fs from "fs/promises";
import os from "os";
import path from "path";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

/** 使用系统 zip（macOS/Linux 常见）；避免 Next 打包 archiver */
export async function zipDirectory(sourceDir: string): Promise<Buffer> {
  const tmpZip = path.join(
    os.tmpdir(),
    `app-factory-${Date.now()}-${path.basename(sourceDir)}.zip`
  );
  await fs.rm(tmpZip, { force: true }).catch(() => {});
  await execFileAsync("zip", ["-r", "-q", tmpZip, "."], { cwd: sourceDir });
  const buffer = await fs.readFile(tmpZip);
  await fs.rm(tmpZip, { force: true }).catch(() => {});
  return buffer;
}
