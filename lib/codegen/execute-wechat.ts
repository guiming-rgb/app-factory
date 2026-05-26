import fs from "fs/promises";
import path from "path";

import { buildSpecForProject } from "@/lib/app-spec/from-report";
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
import {
  runWechatFullBuildValidate,
  shouldFailCodegenOnWechatBuild,
  type WechatFullBuildResult
} from "@/lib/sandbox/wechat-build";
import { generateWechatProject } from "@/lib/wechat-codegen/generate";
import { getSupabaseAdmin } from "@/lib/supabase";

export type WechatCodegenExecuteResult = {
  runId: string;
  fileName: string;
  artifact_path: string;
  spec_source: string;
  displayName: string;
  build: WechatFullBuildResult;
};

function buildWechatMetadata(build: WechatFullBuildResult) {
  return {
    buildStatus: build.status,
    structureStatus: build.structure.status,
    compileStatus: build.compile.status,
    ...(build.reason ? { buildReason: build.reason.slice(0, 200) } : {}),
    ...(build.output ? { buildOutput: build.output.slice(0, 1500) } : {}),
    ...(build.compile.wxmlFiles != null
      ? { compileWxmlFiles: build.compile.wxmlFiles }
      : {}),
    ...(build.compile.wxssFiles != null
      ? { compileWxssFiles: build.compile.wxssFiles }
      : {})
  };
}

export async function executeWechatCodegen(input: {
  projectId: string;
  runId: string;
}): Promise<WechatCodegenExecuteResult> {
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
    const { outputDir, appName, displayName } = await generateWechatProject(spec);
    outputRoot = path.dirname(outputDir);

    const build = runWechatFullBuildValidate({ appDir: outputDir });
    if (shouldFailCodegenOnWechatBuild(build)) {
      const msg = `小程序编译门禁未通过：${build.output?.slice(-3000) ?? build.reason ?? "unknown"}`;
      await markCodegenRunFailed(runId, msg.slice(0, 4000));
      throw new Error(msg);
    }

    const previewHtml = generateSpecPreviewHtml(spec);
    const previewPath = await writePreviewHtml(runId, previewHtml);

    const buffer = await zipDirectory(outputDir);
    const fileName = `${appName}-wechat.zip`;
    const { relativePath: artifact_path, storageUploaded } =
      await writeArtifactFile(runId, fileName, buffer);

    await markCodegenRunCompleted(runId, {
      artifact_path,
      spec_source: built.source,
      metadata: {
        fileName,
        displayName,
        storageUploaded,
        previewPath,
        ...(storageUploaded
          ? { storageBucket: getCodegenStorageBucket() }
          : {}),
        ...buildWechatMetadata(build),
        ...(built.warning ? { specWarning: built.warning.slice(0, 500) } : {})
      }
    });

    return {
      runId,
      fileName,
      artifact_path,
      spec_source: built.source,
      displayName,
      build
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "微信小程序 codegen 失败";
    await markCodegenRunFailed(runId, message).catch(() => {});
    throw err;
  } finally {
    if (outputRoot) {
      await fs.rm(outputRoot, { recursive: true, force: true }).catch(() => {});
    }
  }
}
