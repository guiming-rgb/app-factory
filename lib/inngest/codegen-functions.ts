import { inngest } from "@/lib/inngest/client";
import { assertInngestProjectOwner } from "@/lib/auth/inngest-project-auth";
import type { CodegenTarget } from "@/lib/codegen/base-executor";

// ============================================================
// Inngest Codegen 函数 — 基于 BaseCodegenExecutor 的统一模式
//
// 使用工厂函数消除 flutter/wechat/harmony 三份重复代码。
// 每个平台只有一个 event name 和 executor import path 不同。
// ============================================================

const CODECONFIG: Array<{
  target: CodegenTarget;
  fnId: string;
  fnName: string;
  event: string;
  stepName: string;
  importPath: string;
  exportName: string;
}> = [
  {
    target: "flutter",
    fnId: "codegen-flutter",
    fnName: "Codegen Flutter ZIP",
    event: "project/codegen.flutter.requested",
    stepName: "execute-flutter-codegen",
    importPath: "@/lib/codegen/execute-flutter",
    exportName: "FlutterExecutor",
  },
  {
    target: "wechat",
    fnId: "codegen-wechat",
    fnName: "Codegen WeChat Mini Program ZIP",
    event: "project/codegen.wechat.requested",
    stepName: "execute-wechat-codegen",
    importPath: "@/lib/codegen/execute-wechat",
    exportName: "WechatExecutor",
  },
  {
    target: "harmony",
    fnId: "codegen-harmony",
    fnName: "Codegen Harmony ArkTS ZIP",
    event: "project/codegen.harmony.requested",
    stepName: "execute-harmony-codegen",
    importPath: "@/lib/codegen/execute-harmony",
    exportName: "HarmonyExecutor",
  },
];

/**
 * 工厂：基于配置创建 Inngest 函数
 * 所有平台共享相同的鉴权 + execute 调用模式
 */
function createCodegenFunction(cfg: (typeof CODECONFIG)[number]) {
  return inngest.createFunction(
    {
      id: cfg.fnId,
      name: cfg.fnName,
      // 重试 3 次处理瞬时错误（可通过 CODEGEN_INNGEST_RETRIES 环境变量覆盖）
      retries: (Number(process.env.CODEGEN_INNGEST_RETRIES ?? "3") || 3) as
        | 0 | 1 | 2 | 3 | 4 | 5,
      triggers: [{ event: cfg.event }],
    },
    async ({ event, step }) => {
      const projectId = event.data.projectId as string;
      const runId = event.data.runId as string;
      const userId = event.data.userId as string | undefined;

      if (!projectId || !runId) {
        throw new Error(`[${cfg.target}] 缺少 projectId 或 runId`);
      }

      await assertInngestProjectOwner(projectId, userId);

      const result = await step.run(cfg.stepName, async () => {
        // 动态导入，避免 /api/inngest 顶层 throw
        const mod = (await import(cfg.importPath)) as Record<string, unknown>;
        const ExecutorClass = mod[cfg.exportName] as {
          new (): { execute: (i: { projectId: string; runId: string; userId?: string }) => Promise<unknown> };
        };
        const executor = new ExecutorClass();
        return executor.execute({ projectId, runId, userId });
      });

      return { ...(result as Record<string, unknown>), projectId };
    },
  );
}

export const flutterCodegen = createCodegenFunction(CODECONFIG[0]!);
export const wechatCodegen = createCodegenFunction(CODECONFIG[1]!);
export const harmonyCodegen = createCodegenFunction(CODECONFIG[2]!);

export const flutterDesktopGhaPoll = inngest.createFunction(
  {
    id: "codegen-flutter-desktop-gha",
    name: "Poll Flutter desktop GHA artifacts",
    retries: 1,
    triggers: [{ event: "project/codegen.flutter.desktop-gha.requested" }],
  },
  async ({ event, step }) => {
    const projectId = event.data.projectId as string;
    const runId = event.data.runId as string;
    const appName = event.data.appName as string;
    const workflowRunId = Number(event.data.workflowRunId);
    const userId = event.data.userId as string | undefined;

    if (!projectId || !runId || !appName || !workflowRunId) {
      throw new Error("desktop-gha 事件缺少必要字段");
    }

    await assertInngestProjectOwner(projectId, userId);

    const maxRounds = 40;

    for (let i = 0; i < maxRounds; i++) {
      const outcome = await step.run(`poll-gha-${i}`, async () => {
        const { pollDesktopGhaOnce, finalizeDesktopGhaArtifacts } =
          await import("@/lib/codegen/desktop-gha-orchestrator");
        const { mergeCodegenRunNestedMetadata } = await import(
          "@/lib/codegen/merge-run-metadata"
        );

        const state = await pollDesktopGhaOnce(workflowRunId);
        if (state === "pending") {
          await mergeCodegenRunNestedMetadata(runId, "desktopGha", {
            status: "running",
            workflowRunId,
            message: "GitHub Actions 正在构建 Mac .app 与 Windows .exe…",
          });
          return { done: false as const };
        }
        if (state === "failure") {
          await mergeCodegenRunNestedMetadata(runId, "desktopGha", {
            status: "failed",
            workflowRunId,
            message: "GitHub Actions 桌面构建失败，见 Actions 日志",
          });
          return { done: true as const, ok: false };
        }
        await finalizeDesktopGhaArtifacts({ runId, appName, workflowRunId });
        return { done: true as const, ok: true };
      });

      if (outcome.done) {
        return { projectId, runId, workflowRunId, ok: outcome.ok };
      }

      await step.sleep(`wait-gha-${i}`, "30s");
    }

    await step.run("gha-timeout", async () => {
      const { mergeCodegenRunNestedMetadata } = await import(
        "@/lib/codegen/merge-run-metadata"
      );
      await mergeCodegenRunNestedMetadata(runId, "desktopGha", {
        status: "failed",
        workflowRunId,
        message: "GitHub Actions 构建超时（>20 分钟）",
      });
    });

    return { projectId, runId, workflowRunId, ok: false, reason: "timeout" };
  },
);

export const codegenInngestFunctions = [
  flutterCodegen,
  wechatCodegen,
  harmonyCodegen,
  flutterDesktopGhaPoll,
];
