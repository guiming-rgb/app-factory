// ============================================================
// BaseCodegenExecutor — 三平台代码生成抽象基类
//
// 使用模板方法模式提取 Flutter / WeChat / Harmony 共有的 ~80% 编排逻辑。
// 子类只需实现平台特定的生成器、门禁、元数据构建、结果类型。
//
// 公共管线：
//   1. fetchProject      — 查询项目
//   2. parseSpec         — 解析 AppSpec
//   3. validateSpec      — 校验 + 质量评估
//   4. generateCode      — 平台特定代码生成
//   5. generateSQL       — 可选：SQL DDL 生成
//   6. validateOutput    — 平台特定门禁（analyze/build/structure）
//   7. generatePreview   — HTML 预览
//   8. packageArtifact   — 打包 ZIP + 上传
//   9. buildComplete     — 标记完成 + 组装 metadata
//  10. onError           — 标记失败 + 清理
//
// 钩子方法（可覆盖）：
//   - beforeValidate()   — 门禁前的预处理（如 auto-fix 循环）
//   - afterPackaging()   — 打包后的后处理（如桌面构建、通知）
// ============================================================

import fs from "fs/promises";
import path from "path";

import type { AppSpec } from "@/lib/app-spec/types";
import type { SpecBuildResult } from "@/lib/app-spec/from-report";
import type { SpecQualityReport } from "@/lib/app-spec/spec-quality";

import { resolveSpecForCodegen } from "@/lib/app-spec/resolve-spec";
import { validateAppSpec } from "@/lib/app-spec/validate";
import { assessSpecQuality } from "@/lib/app-spec/spec-quality";
import { isTodoAppSpec } from "@/lib/app-spec/detect-todo-app";
import { writeArtifactFile, writePreviewHtml } from "@/lib/codegen/artifacts";
import { generateSpecPreviewHtml } from "@/lib/codegen/preview-html";
import {
  markCodegenRunRunning,
  markCodegenRunCompleted,
  markCodegenRunFailed,
} from "@/lib/codegen/runs";
import { getCodegenStorageBucket } from "@/lib/codegen/storage";
import { zipDirectory } from "@/lib/flutter-codegen/zip";
import { getSupabaseAdmin } from "@/lib/supabase";

// ============================================================
// 类型定义
// ============================================================

/** 所有平台执行器共用的输入 */
export interface CodegenExecutorInput {
  projectId: string;
  runId: string;
  userId?: string;
}

/** 平台标识 */
export type CodegenTarget = "flutter" | "wechat" | "harmony";

/** 代码生成输出（平台生成器返回） */
export interface CodegenOutput {
  outputDir: string;
  appName: string;
  displayName: string;
  [key: string]: unknown; // 平台可扩展
}

/** 门禁结果基类 */
export interface CodegenGateResult {
  status: "passed" | "failed" | "skipped";
  reason?: string;
  output?: string;
  [key: string]: unknown;
}

/** 元数据构建器输入 */
export interface GateMetadataContext {
  gate: CodegenGateResult;
  specQuality: SpecQualityReport;
  extra?: Record<string, unknown>;
}

/** 抽象基类需要子类实现的契约 */
export interface PlatformCodegenContract<TGate extends CodegenGateResult> {
  /** 平台标识 */
  readonly target: CodegenTarget;

  /** 生成项目代码 */
  generateCode(spec: AppSpec): Promise<CodegenOutput>;

  /** 获取 ZIP 文件名 */
  getFileName(output: CodegenOutput, spec: AppSpec): string;

  /** 执行门禁校验 */
  runGate(output: CodegenOutput): TGate | Promise<TGate>;

  /** 门禁失败判定 */
  isGateFailed(gate: TGate): boolean | Promise<boolean>;

  /** 构建门禁失败的元数据 */
  buildGateMetadata(ctx: GateMetadataContext & { gate: TGate }): Record<string, unknown> | Promise<Record<string, unknown>>;

  /** 门禁失败时生成错误消息 */
  buildGateFailureMsg(gate: TGate): string;

  /** 组装最终执行结果 */
  buildResult(input: {
    runId: string;
    fileName: string;
    artifact_path: string;
    spec_source: string;
    displayName: string;
    gate: TGate;
  }): unknown;
}

// ============================================================
// 管线阶段上下文
// ============================================================

interface PipelineState<TGate extends CodegenGateResult> {
  contract: PlatformCodegenContract<TGate>;
  projectId: string;
  runId: string;
  userId?: string;
  project: {
    id: string;
    title: string;
    idea: string | null;
    final_report: string | null;
    spec_override: unknown;
  };
  built: SpecBuildResult;
  spec: AppSpec;
  quality: SpecQualityReport;
  codegen: CodegenOutput;
  sqlArtifactPath: string | null;
  gate: TGate;
  previewPath: string;
  artifactPath: string;
  fileName: string;
  storageUploaded: boolean;
  outputRoot: string | null;
}

// ============================================================
// BaseCodegenExecutor — 模板方法骨架
// ============================================================

export abstract class BaseCodegenExecutor<TGate extends CodegenGateResult = CodegenGateResult>
  implements PlatformCodegenContract<TGate>
{
  abstract readonly target: CodegenTarget;
  abstract generateCode(spec: AppSpec): Promise<CodegenOutput>;
  abstract getFileName(output: CodegenOutput, spec: AppSpec): string;
  abstract runGate(output: CodegenOutput): TGate | Promise<TGate>;
  abstract isGateFailed(gate: TGate): boolean | Promise<boolean>;
  abstract buildGateMetadata(
    ctx: GateMetadataContext & { gate: TGate },
  ): Record<string, unknown> | Promise<Record<string, unknown>>;
  abstract buildGateFailureMsg(gate: TGate): string;
  abstract buildResult(input: {
    runId: string;
    fileName: string;
    artifact_path: string;
    spec_source: string;
    displayName: string;
    gate: TGate;
  }): unknown;

  // ---- 钩子方法（子类可覆盖） ---- //

  /** 门禁前预处理：Flutter 覆盖实现 auto-fix + AI-fix 循环 */
  async beforeGate(
    _output: CodegenOutput,
    _gate: TGate,
  ): Promise<TGate> {
    return _gate;
  }

  /** 打包后处理：Flutter 覆盖实现桌面构建 + Web 构建 + 通知 */
  async afterPackaging(
    _state: PipelineState<TGate>,
  ): Promise<Record<string, unknown>> {
    return {};
  }

  // ---- 公共管线方法 ---- //

  /** 主入口 — 执行完整管线 */
  async execute(input: CodegenExecutorInput): Promise<unknown> {
    const { projectId, runId, userId } = input;

    // Pre-flight: 清理过期运行 + 标记启动
    await this.preFlight(projectId, runId);

    // Stage 1-2: 获取项目 + 解析 Spec
    const { project, built } = await this.fetchAndResolve(projectId, runId);

    // Stage 3: 验证 Spec
    const { spec, quality } = this.validateAndAssess(built, runId);

    // Stage 4: 代码生成
    const codegen = await this.generateCode(spec);
    const state: PipelineState<TGate> = {
      contract: this,
      projectId,
      runId,
      userId,
      project,
      built,
      spec,
      quality,
      codegen,
      sqlArtifactPath: null,
      gate: {} as TGate,
      previewPath: "",
      artifactPath: "",
      fileName: "",
      storageUploaded: false,
      outputRoot: path.dirname(codegen.outputDir),
    };

    try {
      // Stage 5: SQL DDL（可选）
      state.sqlArtifactPath = await this.generateSQL(runId, spec);

      // Stage 6: 门禁校验
      let gate = await this.runGate(codegen);
      gate = await this.beforeGate(codegen, gate);
      state.gate = gate;

      if (await this.isGateFailed(gate)) {
        const msg = this.buildGateFailureMsg(gate);
        await markCodegenRunFailed(runId, msg.slice(0, 4000));
        throw new Error(msg);
      }

      // Stage 7: HTML 预览
      state.previewPath = await this.generatePreview(runId, spec);

      // Stage 8: 打包上传
      const pkg = await this.packageArtifact(runId, codegen, spec);
      state.fileName = pkg.fileName;
      state.artifactPath = pkg.artifactPath;
      state.storageUploaded = pkg.storageUploaded;

      // 钩子：平台特定后处理
      const extraMeta = await this.afterPackaging(state);

      // Stage 9: 标记完成
      await this.completeRun(runId, state, extraMeta);

      // 返回结果
      return this.buildResult({
        runId,
        fileName: state.fileName,
        artifact_path: state.artifactPath,
        spec_source: built.source,
        displayName: codegen.displayName,
        gate,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : `${this.target} codegen 失败`;
      await markCodegenRunFailed(runId, message).catch(() => {});
      await this.onError(err);
      throw err;
    } finally {
      if (state.outputRoot) {
        await fs.rm(state.outputRoot, { recursive: true, force: true }).catch(() => {});
      }
    }
  }

  // ---- 管线阶段方法 ---- //

  private async preFlight(projectId: string, runId: string): Promise<void> {
    const { cleanupStaleCodegenRuns } = await import("@/lib/codegen/stale-runs");
    await cleanupStaleCodegenRuns({ projectId }).catch(() => {});
    await markCodegenRunRunning(runId);
  }

  private async fetchAndResolve(
    projectId: string,
    runId: string,
  ): Promise<{
    project: PipelineState<CodegenGateResult>["project"];
    built: SpecBuildResult;
  }> {
    const { data: row, error } = await getSupabaseAdmin()
      .from("projects")
      .select("id, title, idea, final_report, status, spec_override")
      .eq("id", projectId)
      .single();

    if (error || !row) {
      const msg = "项目不存在";
      await markCodegenRunFailed(runId, msg);
      throw new Error(msg);
    }

    const project = {
      id: row.id as string,
      title: (row.title as string) ?? "未命名",
      idea: row.idea as string | null,
      final_report: row.final_report as string | null,
      spec_override: row.spec_override,
    };

    const built = await resolveSpecForCodegen(project);
    return { project, built };
  }

  private validateAndAssess(
    built: SpecBuildResult,
    runId: string,
  ): { spec: AppSpec; quality: SpecQualityReport } {
    const validation = validateAppSpec(built.spec);
    if (!validation.ok) {
      const msg = `App Spec 校验失败：${validation.errors.join("; ")}`;
      markCodegenRunFailed(runId, msg).catch(() => {});
      throw new Error(msg);
    }
    return {
      spec: validation.spec,
      quality: assessSpecQuality(validation.spec),
    };
  }

  private async generateSQL(
    runId: string,
    spec: AppSpec,
  ): Promise<string | null> {
    try {
      const { generateCreateTableDDL } = await import(
        "@/lib/app-spec/generate-ddl"
      );
      const ddl = generateCreateTableDDL(spec);
      const sqlBuffer = Buffer.from(ddl.fullSql, "utf8");
      const { relativePath } = await writeArtifactFile(
        runId,
        "supabase_migration.sql",
        sqlBuffer,
      );
      return relativePath;
    } catch (err: unknown) {
      console.warn(
        `[BaseExecutor:${this.target}] SQL upload skipped:`,
        err,
      );
      return null;
    }
  }

  private async generatePreview(
    runId: string,
    spec: AppSpec,
  ): Promise<string> {
    const previewHtml = generateSpecPreviewHtml(spec);
    return writePreviewHtml(runId, previewHtml);
  }

  private async packageArtifact(
    runId: string,
    codegen: CodegenOutput,
    spec: AppSpec,
  ): Promise<{
    fileName: string;
    artifactPath: string;
    storageUploaded: boolean;
  }> {
    const buffer = await zipDirectory(codegen.outputDir);
    const fileName = this.getFileName(codegen, spec);
    const { relativePath: artifactPath, storageUploaded } =
      await writeArtifactFile(runId, fileName, buffer);
    return { fileName, artifactPath, storageUploaded };
  }

  private async completeRun(
    runId: string,
    state: PipelineState<TGate>,
    extraMeta: Record<string, unknown>,
  ): Promise<void> {
    const spec = state.spec;
    const built = state.built;
    const quality = state.quality;

    const gateMeta = await this.buildGateMetadata({
      gate: state.gate,
      specQuality: quality,
    });

    const baseMeta: Record<string, unknown> = {
      fileName: state.fileName,
      displayName: state.codegen.displayName,
      ...(isTodoAppSpec(spec) ? { codegenTodoMvp: true } : {}),
      storageUploaded: state.storageUploaded,
      previewPath: state.previewPath,
      ...(state.storageUploaded
        ? { storageBucket: getCodegenStorageBucket() }
        : {}),
      specQualityScore: quality.score,
      ...(quality.warnings.length
        ? { specQualityWarnings: quality.warnings.join(" · ") }
        : {}),
      ...(built.warning ? { specWarning: built.warning.slice(0, 500) } : {}),
      ...gateMeta,
      ...extraMeta,
    };

    await markCodegenRunCompleted(runId, {
      artifact_path: state.artifactPath,
      spec_source: built.source,
      metadata: baseMeta,
    });
  }

  /** 错误回调 — 子类可覆盖用于 Sentry 上报 */
  protected async onError(_err: unknown): Promise<void> {
    // 默认不做额外处理
  }
}

// ============================================================
// Sync Runner Factory — 所有平台共用
// ============================================================

import {
  createCodegenRun,
  getCodegenRun,
  type CodegenRunRow,
} from "@/lib/codegen/runs";

export async function runCodegenSync(
  target: CodegenTarget,
  executor: BaseCodegenExecutor<any>,
  input: { projectId: string; userId?: string },
): Promise<CodegenRunRow> {
  const run = await createCodegenRun({
    projectId: input.projectId,
    target,
  });

  await executor.execute({
    projectId: input.projectId,
    runId: run.id,
    userId: input.userId,
  });

  const done = await getCodegenRun(run.id);
  if (!done || done.status !== "completed" || !done.artifact_path) {
    throw new Error(done?.log ?? `${target} 生成未完成`);
  }
  return done;
}
