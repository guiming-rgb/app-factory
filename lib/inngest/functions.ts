import { inngest } from "@/lib/inngest/client";
import { codegenInngestFunctions } from "@/lib/inngest/codegen-functions";

/**
 * 整段流水线放在一个 step 内，避免 Inngest 默认「函数级重试」导致 agent_runs 重复插入。
 * 失败时由用户在前端对 failed 项目重试（prepare 会清理旧 runs）。
 *
 * 注意：`executeProjectWorkflow` 使用动态 import，避免本文件被 `/api/inngest` 加载时
 * 立刻拉取 `workflow` → `supabase` / `llm`（二者在缺环境变量时会顶层 throw），导致
 * Inngest Dev「同步 App」收到 internal_server_error。
 */
export const generateProjectReport = inngest.createFunction(
  {
    id: "generate-project-report",
    name: "Generate Project Report",
    retries: 0,
    triggers: [{ event: "project/generate.requested" }]
  },
  async ({ event, step }) => {
    const projectId = event.data.projectId as string;

    if (!projectId || typeof projectId !== "string") {
      throw new Error("缺少 projectId");
    }

    const result = await step.run("execute-project-workflow", async () => {
      const { executeProjectWorkflow } = await import("@/lib/workflow");
      return executeProjectWorkflow(projectId);
    });

    return { ...result, projectId };
  }
);

export const inngestFunctions = [
  generateProjectReport,
  ...codegenInngestFunctions
];
