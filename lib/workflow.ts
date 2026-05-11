import { supabaseAdmin } from "./supabase";
import { agentConfigs } from "./agents";
import { callLLM } from "./llm";
import { buildFinalMarkdownReport } from "./markdown";

/** 与 API 层对齐：重复启动 running 项目时返回 409，便于前端/监控识别 */
export const WORKFLOW_ERROR_ALREADY_RUNNING =
  "项目正在生成中，请勿重复启动";

export type RunWorkflowOptions = {
  /** 仅当项目已为 completed 时有效：为 true 时清空旧结果并重新跑全流程 */
  forceRegenerate?: boolean;
};

export async function runProjectWorkflow(
  projectId: string,
  options?: RunWorkflowOptions
) {
  const forceRegenerate = Boolean(options?.forceRegenerate);

  const { data: project, error: projectError } = await supabaseAdmin
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .single();

  if (projectError || !project) {
    throw new Error("Project not found");
  }

  // running 时禁止任何清理或重复启动，避免并发删除 agent_runs
  if (project.status === "running") {
    return {
      success: false,
      projectId,
      error: WORKFLOW_ERROR_ALREADY_RUNNING
    };
  }

  if (project.status === "completed" && !forceRegenerate) {
    return {
      success: true,
      projectId,
      message: "项目已经生成完成"
    };
  }

  // 失败重试，或已完成且用户明确要求重新生成：清空旧执行记录
  if (
    project.status === "failed" ||
    (project.status === "completed" && forceRegenerate)
  ) {
    await supabaseAdmin.from("agent_runs").delete().eq("project_id", projectId);
  }

  await supabaseAdmin
    .from("projects")
    .update({
      status: "running",
      error_message: null,
      final_report: null,
      updated_at: new Date().toISOString()
    })
    .eq("id", projectId);

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
        throw new Error(`Failed to create agent run: ${agent.name}`);
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
        const message =
          agentError instanceof Error ? agentError.message : "Agent failed";
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

    await supabaseAdmin
      .from("projects")
      .update({
        status: "completed",
        final_report: finalReport,
        updated_at: new Date().toISOString()
      })
      .eq("id", projectId);

    return {
      success: true,
      projectId
    };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Workflow failed";
    await supabaseAdmin
      .from("projects")
      .update({
        status: "failed",
        error_message: message,
        updated_at: new Date().toISOString()
      })
      .eq("id", projectId);

    return {
      success: false,
      projectId,
      error: message
    };
  }
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
