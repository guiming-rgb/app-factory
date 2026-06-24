// ============================================================
// 鸿蒙 ArkTS 代码生成执行器 — 继承 BaseCodegenExecutor
//
// 平台特有：鸿蒙结构校验门禁 + bundleName / screenCount
// ============================================================

import type { AppSpec } from "@/lib/app-spec/types";
import type { CodegenOutput, CodegenGateResult, GateMetadataContext } from "@/lib/codegen/base-executor";
import { BaseCodegenExecutor, runCodegenSync } from "@/lib/codegen/base-executor";

// ============================================================
// Harmony Gate 类型
// ============================================================

export interface HarmonyGateResult extends CodegenGateResult {
  status: "passed" | "failed";
  reason?: string;
}

// ============================================================
// HarmonyExecutor
// ============================================================

export class HarmonyExecutor extends BaseCodegenExecutor<HarmonyGateResult> {
  readonly target = "harmony" as const;

  async generateCode(spec: AppSpec): Promise<CodegenOutput> {
    const { generateHarmonyProject } = await import(
      "@/lib/harmony-codegen/generate"
    );
    const result = await generateHarmonyProject(spec);
    return {
      outputDir: result.outputDir,
      appName: result.appName,
      displayName: result.displayName,
      bundleName: result.bundleName as string,
      screenCount: result.screenCount as number,
    };
  }

  getFileName(output: CodegenOutput): string {
    const bundle = (output as { bundleName?: string }).bundleName;
    return `${bundle || output.appName}-harmony.zip`;
  }

  async runGate(output: CodegenOutput): Promise<HarmonyGateResult> {
    const { runHarmonyStructureValidate } = await import(
      "@/lib/sandbox/harmony-structure"
    ) as {
      runHarmonyStructureValidate: (opts: { appDir: string }) => HarmonyGateResult;
    };
    return runHarmonyStructureValidate({ appDir: output.outputDir });
  }

  async isGateFailed(gate: HarmonyGateResult): Promise<boolean> {
    const { shouldFailCodegenOnHarmonyStructure } = await import(
      "@/lib/sandbox/harmony-structure"
    ) as {
      shouldFailCodegenOnHarmonyStructure: (s: HarmonyGateResult) => boolean;
    };
    return shouldFailCodegenOnHarmonyStructure(gate);
  }

  buildGateMetadata(
    ctx: GateMetadataContext & { gate: HarmonyGateResult },
  ): Record<string, unknown> {
    return {
      buildStatus: ctx.gate.status === "passed" ? "passed" : ctx.gate.status,
      structureStatus: ctx.gate.status,
      analyzeEnvironment: "harmony-structure-only",
      ...(ctx.gate.reason
        ? { buildReason: ctx.gate.reason.slice(0, 200) }
        : {}),
    };
  }

  buildGateFailureMsg(gate: HarmonyGateResult): string {
    return `鸿蒙结构门禁未通过：${gate.reason ?? "unknown"}`;
  }

  buildResult(input: {
    runId: string;
    fileName: string;
    artifact_path: string;
    spec_source: string;
    displayName: string;
    gate: HarmonyGateResult;
  }): HarmonyCodegenExecuteResult {
    return {
      runId: input.runId,
      fileName: input.fileName,
      artifact_path: input.artifact_path,
      spec_source: input.spec_source,
      displayName: input.displayName,
      structure: input.gate,
    };
  }
}

export type HarmonyCodegenExecuteResult = {
  runId: string;
  fileName: string;
  artifact_path: string;
  spec_source: string;
  displayName: string;
  structure: HarmonyGateResult;
};

// ============================================================
// 导出 — 兼容旧 API
// ============================================================

const harmonyExecutor = new HarmonyExecutor();

/** @deprecated 使用 HarmonyExecutor.execute() 替代 */
export async function executeHarmonyCodegen(input: {
  projectId: string;
  runId: string;
}): Promise<HarmonyCodegenExecuteResult> {
  return harmonyExecutor.execute(input) as Promise<HarmonyCodegenExecuteResult>;
}

/** 同步鸿蒙生成（兼容旧 API） */
export async function runHarmonyCodegenSync(input: {
  projectId: string;
  userId?: string;
}) {
  return runCodegenSync("harmony", harmonyExecutor, input);
}
