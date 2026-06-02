import fs from "fs/promises";
import path from "path";

import { resolveSpecForCodegen } from "@/lib/app-spec/resolve-spec";
import { isTodoAppSpec } from "@/lib/app-spec/detect-todo-app";
import { assessSpecQuality } from "@/lib/app-spec/spec-quality";
import { validateAppSpec } from "@/lib/app-spec/validate";
import { writeArtifactFile, writePreviewHtml } from "@/lib/codegen/artifacts";
import { generateSpecPreviewHtml } from "@/lib/codegen/preview-html";
import {
  markCodegenRunCompleted,
  markCodegenRunFailed,
  markCodegenRunRunning
} from "@/lib/codegen/runs";
import { getCodegenStorageBucket } from "@/lib/codegen/storage";
import { zipDirectory } from "@/lib/flutter-codegen/zip";
import { generateHarmonyProject } from "@/lib/harmony-codegen/generate";
import {
  runHarmonyStructureValidate,
  shouldFailCodegenOnHarmonyStructure,
  type HarmonyStructureResult
} from "@/lib/sandbox/harmony-structure";
import { getSupabaseAdmin } from "@/lib/supabase";

export type HarmonyCodegenExecuteResult = {
  runId: string;
  fileName: string;
  artifact_path: string;
  spec_source: string;
  displayName: string;
  structure: HarmonyStructureResult;
};

function buildHarmonyMetadata(
  structure: HarmonyStructureResult,
  specQuality: ReturnType<typeof assessSpecQuality>
) {
  return {
    buildStatus: structure.status === "passed" ? "passed" : structure.status,
    structureStatus: structure.status,
    analyzeEnvironment: "harmony-structure-only",
    ...(structure.reason ? { buildReason: structure.reason.slice(0, 200) } : {}),
    specQualityScore: specQuality.score,
    ...(specQuality.warnings.length
      ? { specQualityWarnings: specQuality.warnings.join(" · ") }
      : {})
  };
}

export async function executeHarmonyCodegen(input: {
  projectId: string;
  runId: string;
}): Promise<HarmonyCodegenExecuteResult> {
  const { projectId, runId } = input;

  const { cleanupStaleCodegenRuns } = await import("@/lib/codegen/stale-runs");
  await cleanupStaleCodegenRuns({ projectId });

  await markCodegenRunRunning(runId);

  const { data: project, error } = await getSupabaseAdmin()
    .from("projects")
    .select("id, title, idea, final_report, status, spec_override")
    .eq("id", projectId)
    .single();

  if (error || !project) {
    const msg = "项目不存在";
    await markCodegenRunFailed(runId, msg);
    throw new Error(msg);
  }

  let outputRoot: string | null = null;

  try {
    const built = await resolveSpecForCodegen({
      id: project.id,
      title: project.title ?? "未命名",
      idea: project.idea,
      final_report: project.final_report,
      spec_override: project.spec_override
    });

    const validation = validateAppSpec(built.spec);
    if (!validation.ok) {
      const msg = `App Spec 校验失败：${validation.errors.join("; ")}`;
      await markCodegenRunFailed(runId, msg);
      throw new Error(msg);
    }

    const spec = validation.spec;
    const specQuality = assessSpecQuality(spec);

    const { outputDir, appName, displayName, bundleName, screenCount } =
      await generateHarmonyProject(spec);
    outputRoot = path.dirname(outputDir);

    // P1: 单独上传 SQL 文件（供 SQL 下载 API）
    try {
      const { generateCreateTableDDL } = await import("@/lib/app-spec/generate-ddl");
      const ddl = generateCreateTableDDL(spec);
      const sqlBuffer = Buffer.from(ddl.fullSql, "utf8");
      await writeArtifactFile(runId, "supabase_migration.sql", sqlBuffer);
    } catch (sqlErr) {
      console.warn("[executeHarmonyCodegen] SQL upload skipped:", sqlErr);
    }

    const structure = runHarmonyStructureValidate({ appDir: outputDir });
    if (shouldFailCodegenOnHarmonyStructure(structure)) {
      const msg = `鸿蒙结构门禁未通过：${structure.reason ?? "unknown"}`;
      await markCodegenRunFailed(runId, msg.slice(0, 4000));
      throw new Error(msg);
    }

    const previewHtml = generateSpecPreviewHtml(spec);
    const previewPath = await writePreviewHtml(runId, previewHtml);

    const buffer = await zipDirectory(outputDir);
    const fileName = `${bundleName || appName}-harmony.zip`;
    const { relativePath: artifact_path, storageUploaded } =
      await writeArtifactFile(runId, fileName, buffer);

    await markCodegenRunCompleted(runId, {
      artifact_path,
      spec_source: built.source,
      metadata: {
        fileName,
        displayName,
        ...(isTodoAppSpec(spec) ? { codegenTodoMvp: true } : {}),
        bundleName,
        screenCount,
        storageUploaded,
        previewPath,
        ...(storageUploaded
          ? { storageBucket: getCodegenStorageBucket() }
          : {}),
        ...buildHarmonyMetadata(structure, specQuality),
        ...(built.warning ? { specWarning: built.warning.slice(0, 500) } : {})
      }
    });

    return {
      runId,
      fileName,
      artifact_path,
      spec_source: built.source,
      displayName,
      structure
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "鸿蒙 codegen 失败";
    await markCodegenRunFailed(runId, message).catch(() => {});
    throw err;
  } finally {
    if (outputRoot) {
      await fs.rm(outputRoot, { recursive: true, force: true }).catch(() => {});
    }
  }
}
