import { supabaseAdmin } from "./supabase";
import { agentConfigs } from "./agents";
import { callLLM } from "./llm";
import { buildFinalMarkdownReport } from "./markdown";

/** 与 API 层对齐：重复启动 running 项目时返回 409 */
export const WORKFLOW_ERROR_ALREADY_RUNNING =
  "项目正在生成中，请勿重复启动";

/** 已完成且未带 forceRegenerate 时拒绝入队 */
export const WORKFLOW_ERROR_COMPLETED_SKIP =
  "项目已经生成完成；如需重新生成请传入 forceRegenerate: true";

export type RunWorkflowOptions = {
  forceRegenerate?: boolean;
};

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "未知错误";
}

/**
 * 由 HTTP API 调用：校验、清理、将项目置为 running，**不**执行 LLM。
 * 成功后由 Inngest 调用 executeProjectWorkflow。
 */
export async function prepareProjectWorkflow(
  projectId: string,
  options: RunWorkflowOptions = {}
) {
  const forceRegenerate = Boolean(options.forceRegenerate);

  const { data: project, error: projectError } = await supabaseAdmin
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .single();

  if (projectError || !project) {
    throw new Error("项目不存在");
  }

  if (project.status === "running") {
    throw new Error(WORKFLOW_ERROR_ALREADY_RUNNING);
  }

  if (project.status === "completed" && !forceRegenerate) {
    throw new Error(WORKFLOW_ERROR_COMPLETED_SKIP);
  }

  if (
    project.status === "failed" ||
    (project.status === "completed" && forceRegenerate)
  ) {
    const { error: deleteError } = await supabaseAdmin
      .from("agent_runs")
      .delete()
      .eq("project_id", projectId);

    if (deleteError) {
      throw new Error(`清理旧 Agent 记录失败：${deleteError.message}`);
    }
  }

  const { error: updateError } = await supabaseAdmin
    .from("projects")
    .update({
      status: "running",
      final_report: null,
      error_message: null,
      updated_at: new Date().toISOString()
    })
    .eq("id", projectId);

  if (updateError) {
    throw new Error(`更新项目状态失败：${updateError.message}`);
  }

  return { projectId };
}

/**
 * 由 Inngest 后台调用：假定项目已为 running，串行跑 8 个 Agent。
 * 不在此处因 status===running 而短路（与 prepare 分工）。
 */
export async function executeProjectWorkflow(projectId: string) {
  const { data: project, error: projectError } = await supabaseAdmin
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .single();

  if (projectError || !project) {
    throw new Error("项目不存在");
  }

  if (project.status === "completed") {
    return { projectId, skipped: true as const };
  }

  if (project.status !== "running") {
    throw new Error(
      `项目状态为 ${project.status}，无法执行后台生成（预期为 running）`
    );
  }

  const contextOutputs: string[] = [];

  try {
    for (const agent of agentConfigs) {
      const runInput = buildAgentInput({
        projectIdea: project.idea,
        previousOutputs: contextOutputs
      });

      const { data: run, error: runCreateError } = await supabaseAdmin
        .from("agent_runs")
        .insert({
          project_id: projectId,
          agent_code: agent.code,
          agent_name: agent.name,
          input: runInput,
          status: "running",
          started_at: new Date().toISOString()
        })
        .select("*")
        .single();

      if (runCreateError || !run) {
        throw new Error(
          `创建 Agent 运行记录失败：${runCreateError?.message || agent.name}`
        );
      }

      try {
        const output = await callLLM({
          systemPrompt: agent.systemPrompt,
          userPrompt: runInput,
          temperature: 0.35
        });

        await supabaseAdmin
          .from("agent_runs")
          .update({
            output,
            status: "completed",
            finished_at: new Date().toISOString()
          })
          .eq("id", run.id);

        contextOutputs.push(`## ${agent.name}\n\n${output}`);
      } catch (agentError: unknown) {
        const message = getErrorMessage(agentError);
        await supabaseAdmin
          .from("agent_runs")
          .update({
            status: "failed",
            error_message: message,
            finished_at: new Date().toISOString()
          })
          .eq("id", run.id);

        throw agentError;
      }
    }

    const finalReport = buildFinalMarkdownReport({
      title: project.title,
      idea: project.idea,
      sections: contextOutputs
    });

    const { error: completeError } = await supabaseAdmin
      .from("projects")
      .update({
        status: "completed",
        final_report: finalReport,
        error_message: null,
        updated_at: new Date().toISOString()
      })
      .eq("id", projectId);

    if (completeError) {
      throw new Error(`更新最终报告失败：${completeError.message}`);
    }

    return { projectId, status: "completed" as const };
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    await supabaseAdmin
      .from("projects")
      .update({
        status: "failed",
        error_message: message,
        updated_at: new Date().toISOString()
      })
      .eq("id", projectId);

    throw error;
  }
}

export async function markProjectFailed(projectId: string, message: string) {
  await supabaseAdmin
    .from("projects")
    .update({
      status: "failed",
      error_message: message,
      updated_at: new Date().toISOString()
    })
    .eq("id", projectId);
}

function buildAgentInput(params: {
  projectIdea: string;
  previousOutputs: string[];
}) {
  const previous =
    params.previousOutputs.length > 0
      ? params.previousOutputs.join("\n\n---\n\n")
      : "暂无，这是第一个智能体。";

  return `
用户的 App 想法如下：

${params.projectIdea}

---

之前其他 AI 智能体已经完成的内容如下：

${previous}

---

请你基于用户想法和已有上下文，完成你自己的专业职责。

要求：
1. 不要简单重复前面智能体的内容。
2. 要补充你的专业判断。
3. 输出必须可执行、结构清晰。
4. 如果有风险，必须明确说明。
5. 不要说“作为 AI”，直接给结论和方案。
`;
}
