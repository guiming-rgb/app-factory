import fs from "fs/promises";
import path from "path";
import { spawnSync } from "child_process";

const FLUTTER_PLATFORM_DIRS: Record<string, string> = {
  ios: "ios",
  android: "android",
  macos: "macos",
  windows: "windows",
  web: "web"
};

/** 从 App Spec 解析 Flutter 目标平台（默认含桌面端） */
export function resolveFlutterPlatforms(spec: {
  targets?: Record<string, unknown>;
}): string[] {
  const flutter = spec.targets?.flutter as
    | { platforms?: string[] }
    | undefined;
  const raw = flutter?.platforms;
  if (Array.isArray(raw) && raw.length > 0) {
    return raw.filter((p) => typeof p === "string" && p.length > 0);
  }
  return ["ios", "android", "macos", "windows", "web"];
}

export async function ensureFlutterPlatformFolders(
  appDir: string,
  platforms: string[]
): Promise<{ ok: boolean; added: string[]; message?: string }> {
  const wanted = platforms.filter((p) => FLUTTER_PLATFORM_DIRS[p]);
  const missing = (
    await Promise.all(
      wanted.map(async (p) => {
        const dir = path.join(appDir, FLUTTER_PLATFORM_DIRS[p]);
        try {
          await fs.access(dir);
          return null;
        } catch {
          return p;
        }
      })
    )
  ).filter((p): p is string => p != null);

  if (missing.length === 0) {
    return { ok: true, added: [] };
  }

  const toCreate = [...new Set([...wanted])];
  const r = spawnSync(
    "flutter",
    ["create", ".", "--platforms", toCreate.join(",")],
    {
      cwd: appDir,
      encoding: "utf8",
      env: process.env
    }
  );

  if (r.status !== 0) {
    return {
      ok: false,
      added: [],
      message: (r.stderr || r.stdout || "flutter create 失败").slice(0, 500)
    };
  }

  const stillMissing: string[] = [];
  for (const p of missing) {
    try {
      await fs.access(path.join(appDir, FLUTTER_PLATFORM_DIRS[p]));
    } catch {
      stillMissing.push(p);
    }
  }

  return {
    ok: stillMissing.length === 0,
    added: missing.filter((p) => !stillMissing.includes(p)),
    message:
      stillMissing.length > 0
        ? `仍缺少目录: ${stillMissing.join(", ")}`
        : undefined
  };
}
