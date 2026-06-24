/**
 * Shared desktop build types — extracted from desktop-build.ts and
 * attach-desktop-releases.ts to break the dependency chain:
 *
 *   flutter.ts → generate.ts → attach-desktop-releases.ts → … → execute-flutter.ts → flutter.ts
 *
 * Both desktop-build.ts and attach-desktop-releases.ts (and any other
 * consumer) import these types from here instead of cross-importing.
 */

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

export type DesktopArtifactPaths = {
  summary: DesktopBuildSummary;
  /** run 元数据扩展（含各平台 artifact 相对路径） */
  metadata: Record<string, unknown>;
};
