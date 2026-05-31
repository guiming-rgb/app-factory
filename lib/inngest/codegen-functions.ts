import { inngest } from "@/lib/inngest/client";
import { assertInngestProjectOwner } from "@/lib/auth/inngest-project-auth";

/**
 * Flutter / 微信小程序 codegen 与方案 8-Agent 并列，独立事件与 codegen_runs 表。
 * 使用 dynamic import，避免 /api/inngest 加载时拉取 supabase/llm 顶层 throw。
 */
export const flutterCodegen = inngest.createFunction(
  {
    id: "codegen-flutter",
    name: "Codegen Flutter ZIP",
    retries: 0,
    triggers: [{ event: "project/codegen.flutter.requested" }]
  },
  async ({ event, step }) => {
    const projectId = event.data.projectId as string;
    const runId = event.data.runId as string;
    const userId = event.data.userId as string | undefined;

    if (!projectId || !runId) {
      throw new Error("缺少 projectId 或 runId");
    }

    await assertInngestProjectOwner(projectId, userId);

    const result = await step.run("execute-flutter-codegen", async () => {
      const { executeFlutterCodegen } = await import(
        "@/lib/codegen/execute-flutter"
      );
      return executeFlutterCodegen({ projectId, runId });
    });

    return { ...result, projectId };
  }
);

export const wechatCodegen = inngest.createFunction(
  {
    id: "codegen-wechat",
    name: "Codegen WeChat Mini Program ZIP",
    retries: 0,
    triggers: [{ event: "project/codegen.wechat.requested" }]
  },
  async ({ event, step }) => {
    const projectId = event.data.projectId as string;
    const runId = event.data.runId as string;
    const userId = event.data.userId as string | undefined;

    if (!projectId || !runId) {
      throw new Error("缺少 projectId 或 runId");
    }

    await assertInngestProjectOwner(projectId, userId);

    const result = await step.run("execute-wechat-codegen", async () => {
      const { executeWechatCodegen } = await import(
        "@/lib/codegen/execute-wechat"
      );
      return executeWechatCodegen({ projectId, runId });
    });

    return { ...result, projectId };
  }
);

export const harmonyCodegen = inngest.createFunction(
  {
    id: "codegen-harmony",
    name: "Codegen Harmony ArkTS ZIP",
    retries: 0,
    triggers: [{ event: "project/codegen.harmony.requested" }]
  },
  async ({ event, step }) => {
    const projectId = event.data.projectId as string;
    const runId = event.data.runId as string;
    const userId = event.data.userId as string | undefined;

    if (!projectId || !runId) {
      throw new Error("缺少 projectId 或 runId");
    }

    await assertInngestProjectOwner(projectId, userId);

    const result = await step.run("execute-harmony-codegen", async () => {
      const { executeHarmonyCodegen } = await import(
        "@/lib/codegen/execute-harmony"
      );
      return executeHarmonyCodegen({ projectId, runId });
    });

    return { ...result, projectId };
  }
);

export const flutterDesktopGhaPoll = inngest.createFunction(
  {
    id: "codegen-flutter-desktop-gha",
    name: "Poll Flutter desktop GHA artifacts",
    retries: 0,
    triggers: [{ event: "project/codegen.flutter.desktop-gha.requested" }]
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
            message: "GitHub Actions 正在构建 Mac .app 与 Windows .exe…"
          });
          return { done: false as const };
        }
        if (state === "failure") {
          await mergeCodegenRunNestedMetadata(runId, "desktopGha", {
            status: "failed",
            workflowRunId,
            message: "GitHub Actions 桌面构建失败，见 Actions 日志"
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
        message: "GitHub Actions 构建超时（>20 分钟）"
      });
    });

    return { projectId, runId, workflowRunId, ok: false, reason: "timeout" };
  }
);

export const codegenInngestFunctions = [
  flutterCodegen,
  wechatCodegen,
  harmonyCodegen,
  flutterDesktopGhaPoll
];
