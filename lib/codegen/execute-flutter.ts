import fs from "fs/promises";
import path from "path";

import { buildSpecForProject } from "@/lib/app-spec/from-report";
import { isTodoAppSpec } from "@/lib/app-spec/detect-todo-app";
import { validateAppSpec } from "@/lib/app-spec/validate";
import { assessSpecQuality } from "@/lib/app-spec/spec-quality";
import { runAutoFixAnalyzeLoop } from "@/lib/codegen/auto-fix-flutter";
import { writeArtifactFile, writePreviewHtml } from "@/lib/codegen/artifacts";
import { generateSpecPreviewHtml } from "@/lib/codegen/preview-html";
import {
  markCodegenRunCompleted,
  markCodegenRunFailed,
  markCodegenRunRunning
} from "@/lib/codegen/runs";
import { getCodegenStorageBucket } from "@/lib/codegen/storage";
import { attachDesktopReleases } from "@/lib/flutter-codegen/attach-desktop-releases";
import { generateFlutterProject } from "@/lib/flutter-codegen/generate";
import { shouldAttemptDesktopBuild } from "@/lib/sandbox/flutter-desktop-build";
import { zipDirectory } from "@/lib/flutter-codegen/zip";
import {
  runDockerFlutterAnalyze,
  shouldFailCodegenOnAnalyze,
  type DockerAnalyzeResult
} from "@/lib/sandbox/docker-analyze";
import { hasDocker } from "@/lib/sandbox/flutter";
import { getSupabaseAdmin } from "@/lib/supabase";

export type FlutterCodegenExecuteResult = {
  runId: string;
  fileName: string;
  artifact_path: string;
  spec_source: string;
  displayName: string;
  analyze: DockerAnalyzeResult;
};

function buildAnalyzeMetadata(
  analyze: DockerAnalyzeResult,
  autoFix?: { rounds: number; log: string[] }
) {
  const analyzeEnvironment = hasDocker()
    ? "docker-local"
    : process.env.VERCEL
      ? "vercel-no-docker"
      : "no-docker";
  return {
    analyzeStatus: analyze.status,
    analyzeEnvironment,
    ...(analyze.reason ? { analyzeReason: analyze.reason.slice(0, 200) } : {}),
    ...(analyze.output
      ? { analyzeOutput: analyze.output.slice(0, 1500) }
      : {}),
    ...(autoFix?.rounds
      ? {
          autoFixRounds: autoFix.rounds,
          autoFixLog: autoFix.log.join("\n").slice(0, 800)
        }
      : {})
  };
}

export async function executeFlutterCodegen(input: {
  projectId: string;
  runId: string;
}): Promise<FlutterCodegenExecuteResult> {
  const { projectId, runId } = input;

  const { cleanupStaleCodegenRuns } = await import("@/lib/codegen/stale-runs");
  await cleanupStaleCodegenRuns({ projectId });

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

    const spec = validation.spec;
    const specQuality = assessSpecQuality(spec);
    const { outputDir, appName, displayName } = await generateFlutterProject(
      spec
    );
    outputRoot = path.dirname(outputDir);

    let initialAnalyze = runDockerFlutterAnalyze({ outDir: outputDir });
    const autoFix = await runAutoFixAnalyzeLoop({
      appDir: outputDir,
      initialAnalyze
    });
    const analyze = autoFix.analyze;

    if (shouldFailCodegenOnAnalyze(analyze)) {
      const msg = `Docker dart analyze 未通过（已尝试自动修错 ${autoFix.rounds} 轮）：${analyze.output?.slice(-3000) ?? analyze.reason ?? "unknown"}`;
      await markCodegenRunFailed(runId, msg.slice(0, 4000));
      throw new Error(msg);
    }

    const previewHtml = generateSpecPreviewHtml(spec);
    const previewPath = await writePreviewHtml(runId, previewHtml);

    const desktop = await attachDesktopReleases({
      appDir: outputDir,
      appName,
      runId
    });

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
        ...(isTodoAppSpec(spec) ? { codegenTodoMvp: true } : {}),
        storageUploaded,
        previewPath,
        ...(storageUploaded
          ? { storageBucket: getCodegenStorageBucket() }
          : {}),
        ...buildAnalyzeMetadata(analyze, autoFix),
        specQualityScore: specQuality.score,
        ...(specQuality.warnings.length
          ? { specQualityWarnings: specQuality.warnings.join(" · ") }
          : {}),
        ...(built.warning ? { specWarning: built.warning.slice(0, 500) } : {}),
        ...(desktop?.metadata ?? {}),
        desktopBuildAttempted: shouldAttemptDesktopBuild()
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
