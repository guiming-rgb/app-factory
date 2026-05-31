import { spawnSync } from "child_process";
import fs from "fs/promises";
import path from "path";

import { hasFlutter } from "@/lib/sandbox/flutter";
import { zipDirectory } from "@/lib/flutter-codegen/zip";

export type DesktopBuildTarget = "macos" | "windows";

export type DesktopBuildItem = {
  target: DesktopBuildTarget;
  status: "passed" | "failed" | "skipped";
  reason?: string;
  /** 供上传 Storage 的 zip 缓冲 */
  zipBuffer?: Buffer;
  zipFileName?: string;
};

export type DesktopBuildSummary = {
  items: DesktopBuildItem[];
  /** 写入工程内「双击运行」目录的说明 */
  readmeLines: string[];
};

function desktopBuildMode(): "off" | "on" | "auto" {
  const raw = process.env.CODEGEN_DESKTOP_BUILD?.trim().toLowerCase();
  if (raw === "0" || raw === "false" || raw === "off") return "off";
  if (raw === "1" || raw === "true" || raw === "on") return "on";
  return "auto";
}

export function shouldAttemptDesktopBuild(): boolean {
  const mode = desktopBuildMode();
  if (mode === "off") return false;
  if (process.env.VERCEL === "1") return false;
  if (!hasFlutter()) return false;
  if (mode === "on") return true;
  return process.platform === "darwin" || process.platform === "win32";
}

export function hostNativeDesktopTarget(): DesktopBuildTarget | null {
  if (process.platform === "darwin") return "macos";
  if (process.platform === "win32") return "windows";
  return null;
}

function buildTimeoutMs(): number {
  const raw = process.env.CODEGEN_DESKTOP_BUILD_TIMEOUT_MS?.trim();
  const n = raw ? Number.parseInt(raw, 10) : 600_000;
  if (!Number.isFinite(n) || n < 60_000) return 600_000;
  return Math.min(n, 900_000);
}

async function pathExists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function findMacAppBundle(
  appDir: string,
  appName: string
): Promise<string | null> {
  const releaseDir = path.join(
    appDir,
    "build/macos/Build/Products/Release"
  );
  if (!(await pathExists(releaseDir))) return null;
  const entries = await fs.readdir(releaseDir, { withFileTypes: true });
  const app = entries.find((e) => e.isDirectory() && e.name.endsWith(".app"));
  if (app) return path.join(releaseDir, app.name);
  const snake = appName.replace(/-/g, "_");
  const guess = path.join(releaseDir, `${snake}.app`);
  if (await pathExists(guess)) return guess;
  return null;
}

async function findWindowsReleaseDir(appDir: string): Promise<string | null> {
  const candidates = [
    path.join(appDir, "build/windows/x64/runner/Release"),
    path.join(appDir, "build/windows/runner/Release")
  ];
  for (const dir of candidates) {
    if (await pathExists(dir)) return dir;
  }
  return null;
}

function runFlutterBuild(
  appDir: string,
  target: DesktopBuildTarget
): { ok: boolean; output: string } {
  const flutterTarget = target === "macos" ? "macos" : "windows";
  const r = spawnSync(
    "flutter",
    ["build", flutterTarget, "--release"],
    {
      cwd: appDir,
      encoding: "utf8",
      timeout: buildTimeoutMs(),
      env: process.env
    }
  );
  const output = [r.stdout, r.stderr].filter(Boolean).join("\n").slice(-4000);
  return { ok: r.status === 0, output };
}

async function buildOne(
  appDir: string,
  appName: string,
  target: DesktopBuildTarget
): Promise<DesktopBuildItem> {
  const native = hostNativeDesktopTarget();
  if (native !== target) {
    return {
      target,
      status: "skipped",
      reason:
        target === "macos"
          ? "需在 macOS 上构建 .app（生产站请用 GitHub Actions 工作流）"
          : "需在 Windows 11 上构建 .exe（生产站请用 GitHub Actions 工作流）"
    };
  }

  const built = runFlutterBuild(appDir, target);
  if (!built.ok) {
    return {
      target,
      status: "failed",
      reason:
        built.output?.slice(-500) || `flutter build ${target} --release 失败`
    };
  }

  if (target === "macos") {
    const appPath = await findMacAppBundle(appDir, appName);
    if (!appPath) {
      return {
        target,
        status: "failed",
        reason: "未找到 build/macos/.../*.app"
      };
    }
    const zipBuffer = await zipDirectory(appPath);
    return {
      target,
      status: "passed",
      zipBuffer,
      zipFileName: `${appName}-macos.app.zip`
    };
  }

  const releaseDir = await findWindowsReleaseDir(appDir);
  if (!releaseDir) {
    return {
      target,
      status: "failed",
      reason: "未找到 build/windows/.../Release"
    };
  }
  const zipBuffer = await zipDirectory(releaseDir);
  return {
    target,
    status: "passed",
    zipBuffer,
    zipFileName: `${appName}-windows.zip`
  };
}

/** 在本机尝试构建可双击的 macOS / Windows 发行包（需本机 Flutter + 对应系统） */
export async function buildDesktopReleases(input: {
  appDir: string;
  appName: string;
  /** 默认仅构建当前系统；设 both 时另一平台会 skipped 并提示用 GHA */
  targets?: DesktopBuildTarget[];
}): Promise<DesktopBuildSummary> {
  const targets = input.targets ?? (
    hostNativeDesktopTarget() ? [hostNativeDesktopTarget()!] : []
  );

  const items: DesktopBuildItem[] = [];
  for (const target of targets) {
    items.push(await buildOne(input.appDir, input.appName, target));
  }

  const readmeLines = [
    "# 可双击运行包（Desktop）",
    "",
    "本目录由 App 生产工厂在**具备 Flutter 的构建机**上自动生成。",
    "",
    "| 文件 | 系统 | 用法 |",
    "|------|------|------|",
    "| `*-macos.app.zip` | Mac 笔记本 / iMac | 解压得到 `.app`，双击打开（首次可能需在「隐私与安全性」允许） |",
    "| `*-windows.zip` | Windows 10/11 | 解压整个文件夹，双击其中的 `.exe` |",
    "",
    "若仅有源码、无上述 zip：说明云端生成未跑桌面编译。请在本机 Mac/Win 用 Flutter 构建，",
    "或在仓库 **Actions → Flutter 桌面双平台构建** 工作流中生成。",
    ""
  ];

  for (const item of items) {
    if (item.status === "passed" && item.zipFileName) {
      readmeLines.push(`- ✅ ${item.zipFileName}`);
    } else if (item.status === "skipped") {
      readmeLines.push(`- ⏭ ${item.target}: ${item.reason ?? "跳过"}`);
    } else {
      readmeLines.push(`- ❌ ${item.target}: ${item.reason ?? "失败"}`);
    }
  }

  return { items, readmeLines };
}

/** 将已构建的 zip 写入工程内「双击运行」目录（并入主 ZIP） */
export async function writeDesktopReleasesIntoProject(
  appDir: string,
  summary: DesktopBuildSummary
): Promise<void> {
  const outDir = path.join(appDir, "双击运行-Desktop");
  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(
    path.join(outDir, "README-双击运行.txt"),
    summary.readmeLines.join("\n"),
    "utf8"
  );
  for (const item of summary.items) {
    if (item.status === "passed" && item.zipBuffer && item.zipFileName) {
      await fs.writeFile(
        path.join(outDir, item.zipFileName),
        item.zipBuffer
      );
    }
  }
}

export function desktopBuildMetadata(summary: DesktopBuildSummary) {
  const meta: Record<string, unknown> = {
    desktopBuild: {}
  };
  const db = meta.desktopBuild as Record<string, unknown>;
  for (const item of summary.items) {
    db[item.target] = {
      status: item.status,
      ...(item.reason ? { reason: item.reason.slice(0, 300) } : {}),
      ...(item.zipFileName ? { fileName: item.zipFileName } : {})
    };
  }
  return meta;
}
