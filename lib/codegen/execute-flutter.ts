import fs from "fs/promises";
import path from "path";

import { resolveSpecForCodegen } from "@/lib/app-spec/resolve-spec";
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
import { scheduleDesktopGhaAfterFlutter } from "@/lib/codegen/desktop-gha-orchestrator";
import { attachDesktopReleases } from "@/lib/flutter-codegen/attach-desktop-releases";
import { generateFlutterProject } from "@/lib/flutter-codegen/generate";
import { preferDesktopGhaOverLocalBuild } from "@/lib/github/desktop-gha-config";
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
  userId?: string;
}): Promise<FlutterCodegenExecuteResult> {
  const { projectId, runId, userId } = input;

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
    const { outputDir, appName, displayName } = await generateFlutterProject(
      spec
    );
    outputRoot = path.dirname(outputDir);

    // P1: 单独上传 SQL 文件（供 SQL 下载 API）
    let sqlArtifactPath: string | null = null;
    try {
      const { generateCreateTableDDL } = await import("@/lib/app-spec/generate-ddl");
      const ddl = generateCreateTableDDL(spec);
      const sqlBuffer = Buffer.from(ddl.fullSql, "utf8");
      const { relativePath } = await writeArtifactFile(
        runId,
        "supabase_migration.sql",
        sqlBuffer
      );
      sqlArtifactPath = relativePath;
    } catch (sqlErr) {
      console.warn("[executeFlutterCodegen] SQL upload skipped:", sqlErr);
    }

    // P0: 后端 API 生成
    let backendApiGenerated = false;
    try {
      const { generateBackendApi } = await import("@/lib/app-spec/generate-backend-api");
      const api = generateBackendApi(spec);
      const backendDir = path.join(path.dirname(outputDir), `${appName}-backend`);
      await fs.mkdir(backendDir, { recursive: true });
      await fs.writeFile(path.join(backendDir, "server.ts"), api.apiRoutes, "utf8");
      await fs.writeFile(path.join(backendDir, "types.ts"), api.supabaseTypes, "utf8");
      await fs.writeFile(path.join(backendDir, ".env.example"), api.envTemplate, "utf8");
      await fs.writeFile(path.join(backendDir, "package.json"), api.packageJson, "utf8");
      await fs.writeFile(path.join(backendDir, "README.md"), api.readme, "utf8");
      // 打包为 ZIP
      const { zipDirectory } = await import("@/lib/flutter-codegen/zip");
      const apiZip = await zipDirectory(backendDir);
      const { relativePath: apiZipPath } = await writeArtifactFile(runId, `${appName}-backend-api.zip`, apiZip);
      // Edge Functions
      try {
        const { generateEdgeFunctions, generateEdgeFunctionIndex } = await import("@/lib/app-spec/generate-edge-functions");
        const funcs = generateEdgeFunctions(spec);
        const edgeDir = path.join(backendDir, "supabase", "functions");
        await fs.mkdir(edgeDir, { recursive: true });
        for (let i = 0; i < funcs.length; i++) {
          const e = spec.entities?.[i] as { name?: string } | undefined;
          const fnName = e?.name ? e.name.toLowerCase() + "s" : `entity_${i}`;
          await fs.writeFile(path.join(edgeDir, fnName, "index.ts"), funcs[i], "utf8");
        }
        await fs.writeFile(path.join(backendDir, "EDGE_FUNCTIONS.md"), generateEdgeFunctionIndex(spec), "utf8");
        await fs.writeFile(path.join(edgeDir, ".gitkeep"), "", "utf8");
      } catch { /* Edge Functions optional */ }
      backendApiGenerated = true;
    } catch (e) {
      console.warn("[executeFlutterCodegen] backend API skipped:", e);
    }

    let initialAnalyze = runDockerFlutterAnalyze({ outDir: outputDir });
    const autoFix = await runAutoFixAnalyzeLoop({
      appDir: outputDir,
      initialAnalyze
    });
    let analyze = autoFix.analyze;

    // P2-2: AI 代码审查回路 — 自动修错枯竭后用 LLM 修复
    if (shouldFailCodegenOnAnalyze(analyze) && analyze.output) {
      try {
        const { tryAiFixAnalyzeErrors } = await import("@/lib/codegen/ai-fix-analyze");
        const aiFixResult = await tryAiFixAnalyzeErrors(analyze.output, outputDir);
        if (aiFixResult.fixed) {
          // 重新跑 analyze
          analyze = runDockerFlutterAnalyze({ outDir: outputDir });
          analyze = {
            ...analyze,
            output: (analyze.output ?? "") + "\n[AI 修复: " + aiFixResult.log.join(" | ") + "]"
          };
        }
      } catch (aiErr) {
        console.warn("[executeFlutterCodegen] AI fix skipped:", aiErr);
      }
    }

    if (shouldFailCodegenOnAnalyze(analyze)) {
      const msg = `Docker dart analyze 未通过（已尝试自动修错 ${autoFix.rounds} 轮 + AI 修复）：${analyze.output?.slice(-3000) ?? analyze.reason ?? "unknown"}`;
      await markCodegenRunFailed(runId, msg.slice(0, 4000));
      throw new Error(msg);
    }

    const previewHtml = generateSpecPreviewHtml(spec);
    const previewPath = await writePreviewHtml(runId, previewHtml);

    const desktop = preferDesktopGhaOverLocalBuild()
      ? null
      : await attachDesktopReleases({
          appDir: outputDir,
          appName,
          runId
        });

    // P1: Flutter Web 构建（有 Flutter SDK 时尝试）
    let flutterWebArtifact: string | null = null;
    try {
      const { tryBuildFlutterWeb } = await import(
        "@/lib/flutter-codegen/build-web"
      );
      const webResult = tryBuildFlutterWeb(outputDir);
      if (webResult.success && webResult.buildDir) {
        const { uploadFlutterWebPreview } = await import(
          "@/lib/codegen/upload-web-preview"
        );
        flutterWebArtifact = await uploadFlutterWebPreview(
          runId,
          webResult.buildDir
        );
      }
    } catch (webErr) {
      console.warn("[executeFlutterCodegen] Web build skipped:", webErr);
    }

    const buffer = await zipDirectory(outputDir);
    const fileName = `${appName}-flutter.zip`;
    const { relativePath: artifact_path, storageUploaded } =
      await writeArtifactFile(runId, fileName, buffer);

    // P1: 缓存指纹
    let specFp = "";
    try {
      const { specFingerprint } = await import("@/lib/codegen/cache");
      specFp = specFingerprint(spec);
    } catch { /* skip */ }

    // 产物自动验证
    let artifactQuality: Record<string, unknown> | null = null;
    try {
      const { verifyGeneratedArtifact } = await import("@/lib/codegen/verify-artifact");
      artifactQuality = await verifyGeneratedArtifact(artifact_path) as unknown as Record<string, unknown>;
    } catch { /* optional */ }

    // 通知（Slack/Discord/Email）
    try {
      const { notifyChannel } = await import("@/lib/notifications-channel");
      await notifyChannel({ projectTitle: project.title ?? "未命名", targets: ["flutter"], status: "completed" });
      const { notifyCodegenComplete } = await import("@/lib/notifications");
      await notifyCodegenComplete({ email: "", projectTitle: project.title ?? "未命名", targets: ["flutter"] }).catch(() => {});
    } catch { /* notification best-effort */ }

    await markCodegenRunCompleted(runId, {
      artifact_path,
      spec_source: built.source,
      metadata: {
        fileName,
        displayName,
        specFingerprint: specFp,
        ...(artifactQuality ?? {}),
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
        ...(flutterWebArtifact ? { flutterWebArtifact } : {}),
        desktopBuildAttempted: shouldAttemptDesktopBuild()
      }
    });

    try {
      const ghaScheduled = await scheduleDesktopGhaAfterFlutter({
        projectId,
        runId,
        appName,
        spec,
        userId
      });
      if (!ghaScheduled.scheduled) {
        /* 未配置 GHA 或本地构建 */
      }
    } catch (err: unknown) {
      const { mergeCodegenRunNestedMetadata } = await import(
        "@/lib/codegen/merge-run-metadata"
      );
      await mergeCodegenRunNestedMetadata(runId, "desktopGha", {
        status: "failed",
        message: (err instanceof Error ? err.message : String(err)).slice(
          0,
          400
        )
      });
    }

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
    try {
      const { notifyChannel } = await import("@/lib/notifications-channel");
      await notifyChannel({ projectTitle: project.title ?? "未命名", targets: ["flutter"], status: "failed", error: message }).catch(() => {});
    } catch { /* notification best-effort */ }
    const { captureError } = await import("@/lib/monitoring");
    await captureError(err, { component: "executeFlutterCodegen", projectId, runId, target: "flutter" }).catch(() => {});
    throw err;
  } finally {
    if (outputRoot) {
      await fs.rm(outputRoot, { recursive: true, force: true }).catch(() => {});
    }
  }
}
