import {
  buildDesktopReleases,
  desktopBuildMetadata,
  shouldAttemptDesktopBuild,
  writeDesktopReleasesIntoProject,
} from "./desktop-build";
import type { DesktopArtifactPaths } from "@/lib/sandbox/desktop-types";
import { writeArtifactFile } from "@/lib/codegen/artifacts";

/**
 * 在 Flutter 工程目录上尝试构建 .app / .exe zip，并可选写入 codegen run 的独立下载文件。
 */
export async function attachDesktopReleases(input: {
  appDir: string;
  appName: string;
  runId?: string;
}): Promise<DesktopArtifactPaths | null> {
  if (!shouldAttemptDesktopBuild()) {
    return null;
  }

  const summary = await buildDesktopReleases({
    appDir: input.appDir,
    appName: input.appName
  });

  await writeDesktopReleasesIntoProject(input.appDir, summary);

  const metadata: Record<string, unknown> = {
    ...desktopBuildMetadata(summary)
  };

  if (input.runId) {
    for (const item of summary.items) {
      if (item.status === "passed" && item.zipBuffer && item.zipFileName) {
        const { relativePath } = await writeArtifactFile(
          input.runId,
          item.zipFileName,
          item.zipBuffer
        );
        const key =
          item.target === "macos"
            ? "desktopMacArtifactPath"
            : "desktopWinArtifactPath";
        metadata[key] = relativePath;
      }
    }
  }

  return { summary, metadata };
}
