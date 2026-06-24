// ============================================================
// 微信小程序代码生成执行器 — 继承 BaseCodegenExecutor
//
// 平台特有：小程序结构校验 + 编译门禁
// ============================================================

import type { AppSpec } from "@/lib/app-spec/types";
import type { CodegenOutput, CodegenGateResult, GateMetadataContext } from "@/lib/codegen/base-executor";
import { BaseCodegenExecutor, runCodegenSync } from "@/lib/codegen/base-executor";

// ============================================================
// WeChat Gate 类型
// ============================================================

export interface WechatGateResult extends CodegenGateResult {
  status: "passed" | "failed" | "skipped";
  structure: { status: string };
  compile: {
    status: string;
    wxmlFiles?: number;
    wxssFiles?: number;
  };
  reason?: string;
  output?: string;
}

// ============================================================
// WechatExecutor
// ============================================================

export class WechatExecutor extends BaseCodegenExecutor<WechatGateResult> {
  readonly target = "wechat" as const;

  async generateCode(spec: AppSpec): Promise<CodegenOutput> {
    const { generateWechatProject } = await import(
      "@/lib/wechat-codegen/generate"
    );
    const result = await generateWechatProject(spec);
    return {
      outputDir: result.outputDir,
      appName: result.appName,
      displayName: result.displayName,
    };
  }

  getFileName(output: CodegenOutput): string {
    return `${output.appName}-wechat.zip`;
  }

  async runGate(output: CodegenOutput): Promise<WechatGateResult> {
    const { runWechatFullBuildValidate } = await import(
      "@/lib/sandbox/wechat-build"
    ) as {
      runWechatFullBuildValidate: (opts: { appDir: string }) => WechatGateResult;
    };
    return runWechatFullBuildValidate({ appDir: output.outputDir });
  }

  async isGateFailed(gate: WechatGateResult): Promise<boolean> {
    const { shouldFailCodegenOnWechatBuild } = await import(
      "@/lib/sandbox/wechat-build"
    ) as {
      shouldFailCodegenOnWechatBuild: (g: WechatGateResult) => boolean;
    };
    return shouldFailCodegenOnWechatBuild(gate);
  }

  buildGateMetadata(
    ctx: GateMetadataContext & { gate: WechatGateResult },
  ): Record<string, unknown> {
    const g = ctx.gate;
    return {
      buildStatus: g.status,
      structureStatus: g.structure.status,
      compileStatus: g.compile.status,
      ...(g.reason ? { buildReason: g.reason.slice(0, 200) } : {}),
      ...(g.output ? { buildOutput: g.output.slice(0, 1500) } : {}),
      ...(g.compile.wxmlFiles != null
        ? { compileWxmlFiles: g.compile.wxmlFiles }
        : {}),
      ...(g.compile.wxssFiles != null
        ? { compileWxssFiles: g.compile.wxssFiles }
        : {}),
    };
  }

  buildGateFailureMsg(gate: WechatGateResult): string {
    return `小程序编译门禁未通过：${gate.output?.slice(-3000) ?? gate.reason ?? "unknown"}`;
  }

  buildResult(input: {
    runId: string;
    fileName: string;
    artifact_path: string;
    spec_source: string;
    displayName: string;
    gate: WechatGateResult;
  }): unknown {
    return {
      runId: input.runId,
      fileName: input.fileName,
      artifact_path: input.artifact_path,
      spec_source: input.spec_source,
      displayName: input.displayName,
      build: input.gate,
    };
  }
}

// ============================================================
// 导出 — 兼容旧 API
// ============================================================

const wechatExecutor = new WechatExecutor();

/** @deprecated 使用 WechatExecutor.execute() 替代 */
export async function executeWechatCodegen(input: {
  projectId: string;
  runId: string;
}): Promise<unknown> {
  return wechatExecutor.execute(input);
}

/** 同步微信生成（兼容旧 API） */
export async function runWechatCodegenSync(input: {
  projectId: string;
  userId?: string;
}) {
  return runCodegenSync("wechat", wechatExecutor, input);
}
