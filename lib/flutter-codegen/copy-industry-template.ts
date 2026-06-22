import fs from "fs/promises";
import path from "path";
import type { IndustryCategory } from "./emit-industry";

const ROOT = process.cwd();
const INDUSTRY_TEMPLATE_DIR = path.join(ROOT, "templates");

/**
 * 将行业模板文件拷贝到生成的 Flutter 项目上。
 * 基础模板（flutter-minimal）已由调用方拷贝完，这里只叠行业层。
 */
export async function copyIndustryTemplate(
  appDir: string,
  industry: IndustryCategory
): Promise<{ copied: number; skipped: number }> {
  if (industry === "generic") return { copied: 0, skipped: 0 };

  const srcDir = path.join(INDUSTRY_TEMPLATE_DIR, `industry-${industry}`);
  let copied = 0, skipped = 0;

  try {
    await fs.access(srcDir);
  } catch {
    return { copied: 0, skipped: 0 };
  }

  async function walk(src: string, base: string) {
    const entries = await fs.readdir(src, { withFileTypes: true });
    for (const ent of entries) {
      const rel = path.join(base, ent.name);
      const from = path.join(src, ent.name);
      const to = path.join(appDir, rel);

      if (ent.isDirectory()) {
        await fs.mkdir(to, { recursive: true });
        await walk(from, rel);
      } else if (ent.isFile()) {
        try {
          await fs.copyFile(from, to);
          copied++;
        } catch { skipped++; }
      }
    }
  }

  // 拷贝 lib/ 下的行业文件（features/<industry>/）
  const libSrc = path.join(srcDir, "lib");
  try {
    await fs.access(libSrc);
    await walk(libSrc, "lib");
  } catch { /* 行业模板可能无 lib 目录 */ }

  return { copied, skipped };
}
