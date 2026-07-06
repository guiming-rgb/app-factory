import { inngest } from "@/lib/inngest/client";
import { assertInngestProjectOwner } from "@/lib/auth/inngest-project-auth";
import { codegenInngestFunctions } from "@/lib/inngest/codegen-functions";

/**
 * P2-15 / W-03: 每个 Agent 独立 Inngest step，避免单 step 超时。
 * retries=1 + runProjectWorkflowAgent 幂等（已完成 Agent 跳过）。
 */
export const generateProjectReport = inngest.createFunction(
  {
    id: "generate-project-report",
    name: "Generate Project Report",
    retries: 1,
    concurrency: { limit: 3 },
    triggers: [{ event: "project/generate.requested" }],
    onFailure: async ({ event, error }) => {
      const original = event.data.event?.data as
        | { projectId?: string }
        | undefined;
      const projectId = original?.projectId;
      if (!projectId) return;

      const { markProjectFailed } = await import("@/lib/workflow");
      await markProjectFailed(projectId, error.message);
    },
  },
  async ({ event, step }) => {
    const projectId = event.data.projectId as string;
    const userId = event.data.userId as string | undefined;

    if (!projectId || typeof projectId !== "string") {
      throw new Error("缺少 projectId");
    }

    await assertInngestProjectOwner(projectId, userId);

    const plan = await step.run("workflow-plan", async () => {
      const { getProjectWorkflowPlan } = await import("@/lib/workflow");
      return getProjectWorkflowPlan(projectId);
    });

    if (plan.action === "skip") {
      return {
        projectId,
        status: "skipped" as const,
        reason: plan.reason,
      };
    }

    for (const agentCode of plan.agentCodes) {
      await step.run(`agent-${agentCode}`, async () => {
        const { runProjectWorkflowAgent } = await import("@/lib/workflow");
        return runProjectWorkflowAgent(projectId, agentCode);
      });
    }

    const result = await step.run("workflow-finalize", async () => {
      const { finalizeProjectWorkflow } = await import("@/lib/workflow");
      return finalizeProjectWorkflow(projectId);
    });

    return { ...result, projectId };
  },
);

export const inngestFunctions = [
  generateProjectReport,
  ...codegenInngestFunctions,
];
