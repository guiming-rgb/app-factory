import fs from "fs/promises";
import path from "path";

import { buildSpecForProject } from "@/lib/app-spec/from-report";
import { validateAppSpec } from "@/lib/app-spec/validate";
import { writeArtifactFile } from "@/lib/codegen/artifacts";
import { getCodegenStorageBucket } from "@/lib/codegen/storage";
import {
  markCodegenRunCompleted,
  markCodegenRunFailed,
  markCodegenRunRunning
} from "@/lib/codegen/runs";
import {
  generateFlutterProject
} from "@/lib/flutter-codegen/generate";
import { zipDirectory } from "@/lib/flutter-codegen/zip";
import {
  runDockerFlutterAnalyze,
  shouldFailCodegenOnAnalyze,
  type DockerAnalyzeResult
} from "@/lib/sandbox/docker-analyze";
import { getSupabaseAdmin } from "@/lib/supabase";

export type FlutterCodegenExecuteResult = {
  runId: string;
  fileName: string;
  artifact_path: string;
  spec_source: string;
  displayName: string;
  analyze: DockerAnalyzeResult;
};

function buildAnalyzeMetadata(analyze: DockerAnalyzeResult) {
  return {
    analyzeStatus: analyze.status,
    ...(analyze.reason ? { analyzeReason: analyze.reason.slice(0, 200) } : {}),
    ...(analyze.output
      ? { analyzeOutput: analyze.output.slice(0, 1500) }
      : {})
  };
}

export async function executeFlutterCodegen(input: {
  projectId: string;
  runId: string;
}): Promise<FlutterCodegenExecuteResult> {
  const { projectId, runId } = input;

  await markCodegenRunRunning(runId);

  const { data: project, error } = await getSupabaseAdmin()
    .from("projects")
    .select("id, title, idea, final_report, status")
    .eq("id", projectId)
    .single();

  if (error || !project) {
    const msg = "项目不存在";
    await markCodegenRunFailed(runId, msg);
    throw new Error(msg);
  }

  let outputRoot: string | null = null;

  try {
    const built = await buildSpecForProject({
      id: project.id,
      title: project.title ?? "未命名",
      idea: project.idea,
      final_report: project.final_report
    });

    const validation = validateAppSpec(built.spec);
    if (!validation.ok) {
      const msg = `App Spec 校验失败：${validation.errors.join("; ")}`;
      await markCodegenRunFailed(runId, msg);
      throw new Error(msg);
    }

    const { outputDir, appName, displayName } = await generateFlutterProject(
      validation.spec
    );
    outputRoot = path.dirname(outputDir);

    const analyze = runDockerFlutterAnalyze({ outDir: outputDir });
    if (shouldFailCodegenOnAnalyze(analyze)) {
      const msg = `Docker dart analyze 未通过：${analyze.output?.slice(-3000) ?? analyze.reason ?? "unknown"}`;
      await markCodegenRunFailed(runId, msg.slice(0, 4000));
      throw new Error(msg);
    }

    const buffer = await zipDirectory(outputDir);
    const fileName = `${appName}-flutter.zip`;
    const { relativePath: artifact_path, storageUploaded } =
      await writeArtifactFile(runId, fileName, buffer);

    await markCodegenRunCompleted(runId, {
      artifact_path,
      spec_source: built.source,
      metadata: {
        fileName,
        displayName,
        storageUploaded,
        ...(storageUploaded
          ? { storageBucket: getCodegenStorageBucket() }
          : {}),
        ...buildAnalyzeMetadata(analyze),
        ...(built.warning ? { specWarning: built.warning.slice(0, 500) } : {})
      }
    });

    return {
      runId,
      fileName,
      artifact_path,
      spec_source: built.source,
      displayName,
      analyze
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Flutter codegen 失败";
    await markCodegenRunFailed(runId, message).catch(() => {});
    throw err;
  } finally {
    if (outputRoot) {
      await fs.rm(outputRoot, { recursive: true, force: true }).catch(() => {});
    }
  }
}
