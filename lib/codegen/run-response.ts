import { artifactExists } from "@/lib/codegen/artifacts";
import type { CodegenRunRow } from "@/lib/codegen/runs";

export type CodegenRunView = CodegenRunRow & {
  downloadUrl: string | null;
};

export async function enrichCodegenRun(
  run: CodegenRunRow,
  projectId: string
): Promise<CodegenRunView> {
  const hasArtifact =
    run.status === "completed" &&
    !!run.artifact_path &&
    (await artifactExists(run.artifact_path));

  return {
    ...run,
    downloadUrl: hasArtifact
      ? `/api/projects/${projectId}/codegen/runs/${run.id}/download`
      : null
  };
}

export async function enrichCodegenRuns(
  runs: CodegenRunRow[],
  projectId: string
): Promise<CodegenRunView[]> {
  return Promise.all(runs.map((run) => enrichCodegenRun(run, projectId)));
}
