// ============================================================
// Flutter 代码生成执行器 — 继承 BaseCodegenExecutor
//
// 平台特有：Docker dart analyze + auto-fix + AI-fix 回路
//          后端 API 生成、Edge Functions、桌面构建、Web 构建
// ============================================================

import fs from "fs/promises";
import path from "path";

import type { AppSpec } from "@/lib/app-spec/types";
import type { CodegenOutput, CodegenGateResult, GateMetadataContext } from "@/lib/codegen/base-executor";
import { BaseCodegenExecutor, runCodegenSync } from "@/lib/codegen/base-executor";
import type {
  DockerAnalyzeResult,
} from "@/lib/sandbox/docker-analyze";

// ============================================================
// Flutter Gate 类型
// ============================================================

export interface FlutterGateResult extends CodegenGateResult {
  status: "passed" | "failed" | "skipped";
  reason?: string;
  output?: string;
  /** 自动修复轮次 */
  autoFixRounds?: number;
  autoFixLog?: string[];
  /** AI 修复是否被调用 */
  aiFixApplied?: boolean;
  aiFixLog?: string[];
}

// ============================================================
// FlutterExecutor
// ============================================================

export class FlutterExecutor extends BaseCodegenExecutor<FlutterGateResult> {
  readonly target = "flutter" as const;

  async generateCode(spec: AppSpec): Promise<CodegenOutput> {
    const { generateFlutterProject } = await import(
      "@/lib/flutter-codegen/generate"
    );
    const result = await generateFlutterProject(spec);
    return {
      outputDir: result.outputDir,
      appName: result.appName,
      displayName: result.displayName,
    };
  }

  getFileName(output: CodegenOutput): string {
    return `${output.appName}-flutter.zip`;
  }

  async runGate(output: CodegenOutput): Promise<FlutterGateResult> {
    const { runDockerFlutterAnalyze } = await import(
      "@/lib/sandbox/docker-analyze"
    );
    const analyze = runDockerFlutterAnalyze({ outDir: output.outputDir });
    return {
      status: analyze.status as "passed" | "failed" | "skipped",
      reason: analyze.reason,
      output: analyze.output,
    };
  }

  isGateFailed(gate: FlutterGateResult): boolean {
    return gate.status === "failed";
  }

  async buildGateMetadata(
    ctx: GateMetadataContext & { gate: FlutterGateResult },
  ): Promise<Record<string, unknown>> {
    const { hasDocker } = await import("@/lib/sandbox/flutter") as {
      hasDocker: () => boolean;
    };
    const analyzeEnvironment = hasDocker()
      ? "docker-local"
      : process.env.VERCEL
        ? "vercel-no-docker"
        : "no-docker";

    return {
      analyzeStatus: ctx.gate.status,
      analyzeEnvironment,
      ...(ctx.gate.reason
        ? { analyzeReason: ctx.gate.reason.slice(0, 200) }
        : {}),
      ...(ctx.gate.output
        ? { analyzeOutput: ctx.gate.output.slice(0, 1500) }
        : {}),
      ...(ctx.gate.autoFixRounds
        ? {
            autoFixRounds: ctx.gate.autoFixRounds,
            autoFixLog: (ctx.gate.autoFixLog ?? []).join("\n").slice(0, 800),
          }
        : {}),
      ...(ctx.gate.aiFixApplied
        ? {
            aiFixApplied: true,
            aiFixLog: (ctx.gate.aiFixLog ?? []).join(" | ").slice(0, 500),
          }
        : {}),
    };
  }

  buildGateFailureMsg(gate: FlutterGateResult): string {
    return (
      `Docker dart analyze 未通过` +
      (gate.autoFixRounds
        ? `（已尝试自动修错 ${gate.autoFixRounds} 轮）`
        : "") +
      `：${gate.output?.slice(-3000) ?? gate.reason ?? "unknown"}`
    );
  }

  // ============================================================
  // Flutter 特有：auto-fix + AI-fix 循环
  // ============================================================

  async beforeGate(
    _output: CodegenOutput,
    gate: FlutterGateResult,
  ): Promise<FlutterGateResult> {
    const outputDir = _output.outputDir;
    const { shouldFailCodegenOnAnalyze } = await import(
      "@/lib/sandbox/docker-analyze"
    );

    let currentGate = gate;

    // Phase 1: 自动修复循环
    if (shouldFailCodegenOnAnalyze(currentGate as unknown as DockerAnalyzeResult)) {
      const { runAutoFixAnalyzeLoop } = await import(
        "@/lib/codegen/auto-fix-flutter"
      );
      const autoFix = await runAutoFixAnalyzeLoop({
        appDir: outputDir,
        initialAnalyze: {
          status: currentGate.status,
          reason: currentGate.reason,
          output: currentGate.output,
        } as DockerAnalyzeResult,
      });

      currentGate = {
        ...currentGate,
        status: autoFix.analyze.status as "passed" | "failed",
        output: autoFix.analyze.output ?? currentGate.output,
        autoFixRounds: autoFix.rounds,
        autoFixLog: autoFix.log,
      };

      // Phase 2: AI 修复（自动修复枯竭后）
      if (
        shouldFailCodegenOnAnalyze(
          autoFix.analyze,
        ) &&
        autoFix.analyze.output
      ) {
        try {
          const { tryAiFixAnalyzeErrors } = await import(
            "@/lib/codegen/ai-fix-analyze"
          );
          const { runDockerFlutterAnalyze } = await import(
            "@/lib/sandbox/docker-analyze"
          );
          const aiFixResult = await tryAiFixAnalyzeErrors(
            autoFix.analyze.output,
            outputDir,
          );

          if (aiFixResult.fixed) {
            const reAnalyze = runDockerFlutterAnalyze({ outDir: outputDir });
            currentGate = {
              ...currentGate,
              status: reAnalyze.status as "passed" | "failed",
              output:
                (reAnalyze.output ?? "") +
                "\n[AI 修复: " +
                aiFixResult.log.join(" | ") +
                "]",
              aiFixApplied: true,
              aiFixLog: aiFixResult.log,
            };
          }
        } catch (err: unknown) {
          console.warn("[FlutterExecutor] AI fix skipped:", err);
        }
      }
    }

    return currentGate;
  }

  // ============================================================
  // Flutter 特有：后端 API + Edge Functions + 桌面构建 + Web 构建 + 通知
  // ============================================================

  async afterPackaging(pipelineState: {
    spec: AppSpec;
    codegen: CodegenOutput;
    runId: string;
    projectId: string;
    userId?: string;
    project: { id: string; title: string };
  }): Promise<Record<string, unknown>> {
    const extraMeta: Record<string, unknown> = {};
    const { spec, codegen, runId, projectId, userId } = pipelineState;

    // ---- 后端 API + Edge Functions ---- //
    try {
      // eslint-disable-next-line prefer-const
      let { generateBackendApi } = await import(
        "@/lib/app-spec/generate-backend-api"
      );
      const api = generateBackendApi(spec);
      const backendDir = path.join(
        path.dirname(codegen.outputDir),
        `${codegen.appName}-backend`,
      );
      await fs.mkdir(backendDir, { recursive: true });
      await Promise.all([
        fs.writeFile(path.join(backendDir, "server.ts"), api.apiRoutes, "utf8"),
        fs.writeFile(path.join(backendDir, "types.ts"), api.supabaseTypes, "utf8"),
        fs.writeFile(path.join(backendDir, ".env.example"), api.envTemplate, "utf8"),
        fs.writeFile(path.join(backendDir, "package.json"), api.packageJson, "utf8"),
        fs.writeFile(path.join(backendDir, "README.md"), api.readme, "utf8"),
      ]);

      // Edge Functions
      try {
        const { generateEdgeFunctions: genFuncs, generateEdgeFunctionIndex } =
          await import("@/lib/app-spec/generate-edge-functions");
        const funcs = genFuncs(spec);
        const edgeDir = path.join(backendDir, "supabase", "functions");
        await fs.mkdir(edgeDir, { recursive: true });
        const entities = spec.entities as Array<{ name?: string }> | undefined;
        for (let i = 0; i < funcs.length; i++) {
          const e = entities?.[i];
          const fnName = e?.name ? e.name.toLowerCase() + "s" : `entity_${i}`;
          const fnDir = path.join(edgeDir, fnName);
          await fs.mkdir(fnDir, { recursive: true });
          await fs.writeFile(path.join(fnDir, "index.ts"), funcs[i], "utf8");
        }
        await fs.writeFile(path.join(backendDir, "EDGE_FUNCTIONS.md"), generateEdgeFunctionIndex(spec), "utf8");
        await fs.writeFile(path.join(edgeDir, ".gitkeep"), "", "utf8");
      } catch (err) {
        console.warn("[FlutterExecutor] Edge Functions optional step failed:", err);
      }

      // 打包 API ZIP
      const { zipDirectory } = await import("@/lib/codegen/zip");
      const apiZip = await zipDirectory(backendDir);
      const { writeArtifactFile } = await import("@/lib/codegen/artifacts");
      await writeArtifactFile(runId, `${codegen.appName}-backend-api.zip`, apiZip);
      extraMeta["backendApiGenerated"] = true;
    } catch (err: unknown) {
      console.warn("[FlutterExecutor] backend API skipped:", err);
    }

    // ---- 桌面构建 ---- //
    try {
      const { preferDesktopGhaOverLocalBuild } = await import(
        "@/lib/github/desktop-gha-config"
      );
      if (!preferDesktopGhaOverLocalBuild()) {
        const { attachDesktopReleases } = await import(
          "@/lib/flutter-codegen/attach-desktop-releases"
        );
        const desktop = await attachDesktopReleases({
          appDir: codegen.outputDir,
          appName: codegen.appName,
          runId,
        });
        if (desktop?.metadata) Object.assign(extraMeta, desktop.metadata);
      }
      const { shouldAttemptDesktopBuild } = await import(
        "@/lib/flutter-codegen/desktop-build"
      );
      extraMeta["desktopBuildAttempted"] = shouldAttemptDesktopBuild();
    } catch (err: unknown) {
      console.warn("[FlutterExecutor] desktop build skipped:", err);
    }

    // ---- Web 构建 ---- //
    try {
      const { tryBuildFlutterWeb } = await import(
        "@/lib/flutter-codegen/build-web"
      );
      const webResult = tryBuildFlutterWeb(codegen.outputDir);
      if (webResult.success && webResult.buildDir) {
        const { uploadFlutterWebPreview } = await import(
          "@/lib/codegen/upload-web-preview"
        );
        const flutterWebArtifact = await uploadFlutterWebPreview(
          runId,
          webResult.buildDir,
        );
        extraMeta["flutterWebArtifact"] = flutterWebArtifact;
      }
    } catch (err: unknown) {
      console.warn("[FlutterExecutor] Web build skipped:", err);
    }

    // ---- 通知 ---- //
    void this.notifyComplete(pipelineState.project.title ?? "未命名", "completed");

    // ---- GHA 桌面触发 ---- //
    void this.scheduleGha(projectId, runId, codegen.appName, spec, userId);

    return extraMeta;
  }

  // ---- 辅助 ---- //

  private async notifyComplete(
    projectTitle: string,
    status: "completed" | "failed",
    error?: string,
  ): Promise<void> {
    try {
      const { notifyChannel } = await import("@/lib/notifications-channel");
      const { notifyCodegenComplete } = await import("@/lib/notifications");
      await Promise.allSettled([
        notifyChannel({ projectTitle, targets: ["flutter"], status, error }),
        notifyCodegenComplete({
          email: "",
          projectTitle,
          targets: ["flutter"],
        }),
      ]);
    } catch (err) {
      console.warn("[FlutterExecutor] best-effort step failed:", err);
    }
  }

  private async scheduleGha(
    projectId: string,
    runId: string,
    appName: string,
    spec: AppSpec,
    userId?: string,
  ): Promise<void> {
    try {
      const { scheduleDesktopGhaAfterFlutter } = await import(
        "@/lib/codegen/desktop-gha-orchestrator"
      );
      await scheduleDesktopGhaAfterFlutter({
        projectId, runId, appName, spec, userId,
      });
    } catch (err: unknown) {
      const { mergeCodegenRunNestedMetadata } = await import(
        "@/lib/codegen/merge-run-metadata"
      );
      await mergeCodegenRunNestedMetadata(runId, "desktopGha", {
        status: "failed",
        message: (err instanceof Error ? err.message : String(err)).slice(0, 400),
      }).catch((err) => console.warn("[FlutterExecutor] status update failed:", err));
    }
  }

  protected async onError(err: unknown): Promise<void> {
    try {
      const { captureError } = await import("@/lib/monitoring");
      await captureError(err, {
        component: "FlutterExecutor",
        target: "flutter",
      });
    } catch (err) {
      console.warn("[FlutterExecutor] telemetry report failed:", err);
    }
  }

  buildResult(input: {
    runId: string;
    fileName: string;
    artifact_path: string;
    spec_source: string;
    displayName: string;
    gate: FlutterGateResult;
  }): FlutterCodegenExecuteResult {
    return {
      runId: input.runId,
      fileName: input.fileName,
      artifact_path: input.artifact_path,
      spec_source: input.spec_source,
      displayName: input.displayName,
      analyze: {
        status: input.gate.status,
        reason: input.gate.reason,
        output: input.gate.output,
      },
    };
  }
}

export type FlutterCodegenExecuteResult = {
  runId: string;
  fileName: string;
  artifact_path: string;
  spec_source: string;
  displayName: string;
  analyze: { status: string; reason?: string; output?: string };
};

// ============================================================
// 导出 — 兼容旧 API
// ============================================================

const flutterExecutor = new FlutterExecutor();

/** @deprecated 使用 FlutterExecutor.execute() 替代 */
export async function executeFlutterCodegen(input: {
  projectId: string;
  runId: string;
  userId?: string;
}): Promise<FlutterCodegenExecuteResult> {
  return flutterExecutor.execute(input) as Promise<FlutterCodegenExecuteResult>;
}

/** 同步 Flutter 生成（兼容旧 API） */
export async function runFlutterCodegenSync(input: {
  projectId: string;
  userId?: string;
}) {
  return runCodegenSync("flutter", flutterExecutor, input);
}
