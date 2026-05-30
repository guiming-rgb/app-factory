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

export const codegenInngestFunctions = [
  flutterCodegen,
  wechatCodegen,
  harmonyCodegen
];
