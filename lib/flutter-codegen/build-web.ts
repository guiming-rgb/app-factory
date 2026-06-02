import { spawnSync } from "child_process";

/**
 * P1: Flutter Web 构建
 * 执行 `flutter build web --release` 并返回构建产物目录
 */

export type WebBuildResult = {
  success: boolean;
  buildDir?: string;
  error?: string;
};

/**
 * 尝试构建 Flutter Web 产物。
 * 若 Flutter SDK 不可用则优雅降级，返回 success: false。
 */
export function tryBuildFlutterWeb(appDir: string): WebBuildResult {
  // 先检查 Flutter 是否可用
  const check = spawnSync("flutter", ["--version"], {
    encoding: "utf8",
    timeout: 10000
  });

  if (check.status !== 0) {
    return {
      success: false,
      error: "Flutter SDK 不可用（构建环境无 Flutter），Web 预览跳过"
    };
  }

  const r = spawnSync("flutter", ["build", "web", "--release"], {
    cwd: appDir,
    encoding: "utf8",
    timeout: 120000,
    env: process.env
  });

  if (r.status !== 0) {
    // 提取最后 500 字符的错误信息
    const errText = (r.stderr || r.stdout || "build web 失败").slice(-500);
    return {
      success: false,
      error: `flutter build web 失败：${errText}`
    };
  }

  return {
    success: true,
    buildDir: `${appDir}/build/web`
  };
}
