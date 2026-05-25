import { artifactExists } from "@/lib/codegen/artifacts";
import type { CodegenRunRow } from "@/lib/codegen/runs";

export type CodegenRunView = CodegenRunRow & {
  downloadUrl: string | null;
  previewUrl: string | null;
};

export async function enrichCodegenRun(
  run: CodegenRunRow,
  projectId: string
): Promise<CodegenRunView> {
  const meta = (run.metadata ?? {}) as { previewPath?: string };
  const hasArtifact =
    run.status === "completed" &&
    !!run.artifact_path &&
    (await artifactExists(run.artifact_path));

  const previewPath =
    typeof meta.previewPath === "string" ? meta.previewPath : null;
  const hasPreview =
    run.status === "completed" &&
    !!previewPath &&
    (await artifactExists(previewPath));

  return {
    ...run,
    downloadUrl: hasArtifact
      ? `/api/projects/${projectId}/codegen/runs/${run.id}/download`
      : null,
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
