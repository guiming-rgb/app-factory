import { artifactExists } from "@/lib/codegen/artifacts";
import type { CodegenRunRow } from "@/lib/codegen/runs";

export type CodegenRunView = CodegenRunRow & {
  downloadUrl: string | null;
  /** macOS 可双击 .app.zip（工厂 Storage，体积须 < Vercel 限制） */
  downloadMacUrl: string | null;
  /** Mac 包在 GitHub Actions Artifacts（约 50MB，生产站常用） */
  downloadMacGithubUrl: string | null;
  /** Windows 可双击发行包 zip */
  downloadWinUrl: string | null;
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
  const hasArtifact =
    run.status === "completed" &&
    !!run.artifact_path &&
    (await artifactExists(run.artifact_path));

  const macPath =
    typeof meta.desktopMacArtifactPath === "string"
      ? meta.desktopMacArtifactPath
      : null;
  const winPath =
    typeof meta.desktopWinArtifactPath === "string"
      ? meta.desktopWinArtifactPath
      : null;
  const hasMac =
    run.status === "completed" && !!macPath && (await artifactExists(macPath));
  const hasWin =
    run.status === "completed" && !!winPath && (await artifactExists(winPath));

  const previewPath =
    typeof meta.previewPath === "string" ? meta.previewPath : null;
  const hasPreview =
    run.status === "completed" &&
    !!previewPath &&
    (await artifactExists(previewPath));

  const base = `/api/projects/${projectId}/codegen/runs/${run.id}/download`;

  const macGithubUrl =
    typeof meta.desktopMacGithubUrl === "string"
      ? meta.desktopMacGithubUrl
      : typeof meta.desktopGha?.desktopMacGithubUrl === "string"
        ? meta.desktopGha.desktopMacGithubUrl
        : null;
  const showMacGithub =
    run.status === "completed" &&
    (meta.desktopMacOnGithub === true || (!hasMac && !!macGithubUrl)) &&
    !!macGithubUrl;

  return {
    ...run,
    downloadUrl: hasArtifact ? base : null,
    downloadMacUrl: hasMac ? `${base}?kind=macos` : null,
    downloadMacGithubUrl: showMacGithub ? macGithubUrl : null,
    downloadWinUrl: hasWin ? `${base}?kind=windows` : null,
    previewUrl: hasPreview
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
