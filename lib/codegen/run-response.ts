import { artifactExists } from "@/lib/codegen/artifacts";
import {
  resolveMacGithubUrl,
  shouldUseMacGithubDownload
} from "@/lib/codegen/mac-download";
import type { CodegenRunRow } from "@/lib/codegen/runs";

export type CodegenRunView = CodegenRunRow & {
  downloadUrl: string | null;
  /** macOS 可双击 .app.zip（工厂 Storage，体积须 < Vercel 限制） */
  downloadMacUrl: string | null;
  /** Mac 包在 GitHub Actions Artifacts（约 50MB，生产站常用） */
  downloadMacGithubUrl: string | null;
  /** Windows 可双击发行包 zip */
  downloadWinUrl: string | null;
  /** Supabase 建表 SQL 下载 */
  sqlDownloadUrl: string | null;
  /** Flutter Web 预览 ZIP */
  flutterWebUrl: string | null;
  previewUrl: string | null;
};

export async function enrichCodegenRun(
  run: CodegenRunRow,
  projectId: string
): Promise<CodegenRunView> {
  const meta = (run.metadata ?? {}) as {
    previewPath?: string;
    desktopMacArtifactPath?: string;
    desktopWinArtifactPath?: string;
    desktopMacOnGithub?: boolean;
    desktopMacGithubUrl?: string;
    desktopGha?: { workflowRunId?: number; desktopMacGithubUrl?: string };
  };

  // ── P2 优化：并行检查所有 artifact（替代 6 次串行 I/O）──
  const isDone = run.status === "completed";
  const macPath = typeof meta.desktopMacArtifactPath === "string" ? meta.desktopMacArtifactPath : null;
  const winPath = typeof meta.desktopWinArtifactPath === "string" ? meta.desktopWinArtifactPath : null;
  const previewPath = typeof meta.previewPath === "string" ? meta.previewPath : null;
  const sqlPath = `${run.id}/supabase_migration.sql`;
  const webPath = `${run.id}/flutter-web.zip`;

  const pathsToCheck: Array<{ key: string; path: string | null }> = [
    { key: "artifact", path: run.artifact_path },
    { key: "mac", path: macPath },
    { key: "win", path: winPath },
    { key: "preview", path: previewPath },
    { key: "sql", path: sqlPath },
    { key: "web", path: isDone && run.target === "flutter" ? webPath : null },
  ];

  const results = await Promise.all(
    pathsToCheck.map(async ({ key, path }) => ({
      key,
      exists: isDone && !!path && (await artifactExists(path)),
    }))
  );
  const exists = Object.fromEntries(results.map((r) => [r.key, r.exists]));

  const macGithubUrl = resolveMacGithubUrl(meta);
  const macUseGithub = shouldUseMacGithubDownload(meta) || !!macGithubUrl;
  const hasMac = exists.mac && !macUseGithub;

  const base = `/api/projects/${projectId}/codegen/runs/${run.id}/download`;
  const showMacGithub = run.target === "flutter" && isDone && !!macGithubUrl;

  return {
    ...run,
    downloadUrl: exists.artifact ? base : null,
    downloadMacUrl: hasMac ? `${base}?kind=macos` : null,
    downloadMacGithubUrl: showMacGithub ? macGithubUrl : null,
    downloadWinUrl: exists.win ? `${base}?kind=windows` : null,
    sqlDownloadUrl: exists.sql ? `/api/projects/${projectId}/codegen/runs/${run.id}/sql` : null,
    flutterWebUrl: exists.web ? `${base}?kind=flutter-web` : null,
    previewUrl: exists.preview
      ? `/api/projects/${projectId}/codegen/runs/${run.id}/preview`
      : null
  };
}

export async function enrichCodegenRuns(
  runs: CodegenRunRow[],
  projectId: string
): Promise<CodegenRunView[]> {
  return Promise.all(runs.map((run) => enrichCodegenRun(run, projectId)));
}
