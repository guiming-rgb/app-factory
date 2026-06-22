import { execSync } from "child_process";

/** 检测本机是否安装 Flutter SDK */
export function hasFlutter(): boolean {
  try {
    execSync("flutter --version", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}
