import { getSupabaseAdmin } from "./supabase";
import { agentConfigs } from "./agents";
import { callLLM } from "./llm";
import { buildFinalMarkdownReport } from "./markdown";
import {
  formatMemoriesForPrompt,
  listProjectMemoriesForWorkflow
} from "./memories/server";
import { loadAgentSkillBindings } from "./agents/skill-bindings";
import {
  formatSkillsForPrompt,
  getPublishedSkillsByCodes,
  type Skill
} from "./skills/server";
import {
  deleteUsageLogsForProject,
  insertUsageLog
} from "./usage-logs";

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

  const { data: project, error: projectError } = await getSupabaseAdmin()
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
    const { error: deleteError } = await getSupabaseAdmin()
      .from("agent_runs")
      .delete()
      .eq("project_id", projectId);

    if (deleteError) {
      throw new Error(`清理旧 Agent 记录失败：${deleteError.message}`);
    }

    await deleteUsageLogsForProject(projectId);
  }

  const { error: updateError } = await getSupabaseAdmin()
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
 * 由 Inngest 后台调用：仅当 projects.status === running 时执行 8 Agent。
 * - completed：幂等 skipped（重复/延迟事件）。
 * - pending / failed / 其它非 running：skipped 且不改库，避免过期事件被外层 catch 误标为 projects.failed。
 */
export async function executeProjectWorkflow(projectId: string) {
  const { data: project, error: projectError } = await getSupabaseAdmin()
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .single();

  if (projectError || !project) {
    throw new Error("项目不存在");
  }

  if (project.status === "completed") {
    return {
      projectId,
      status: "skipped" as const,
      reason: "项目已完成，跳过重复执行（幂等）"
    };
  }

  if (project.status !== "running") {
    return {
      projectId,
      status: "skipped" as const,
      reason: `项目当前状态为 ${project.status}，非 running，跳过后台任务（可能为延迟的过期事件）`
    };
  }

  const contextOutputs: string[] = [];
  const workflowMemories = await listProjectMemoriesForWorkflow(projectId);
  const memoryBlock = formatMemoriesForPrompt(workflowMemories);
  const agentSkillBindings = await loadAgentSkillBindings();
  const allSkillCodes = [
    ...new Set(Object.values(agentSkillBindings).flat())
  ];
  const publishedSkills = await getPublishedSkillsByCodes(allSkillCodes);
  const skillsByCode = new Map(publishedSkills.map((s) => [s.code, s]));

  try {
    for (const agent of agentConfigs) {
      const agentSkillCodes = agentSkillBindings[agent.code] ?? [];
      const agentSkills = agentSkillCodes
        .map((code) => skillsByCode.get(code))
        .filter((s): s is Skill => !!s);
      const skillsBlock = formatSkillsForPrompt(agentSkills);
      const systemPrompt = skillsBlock
        ? `${agent.systemPrompt}

---

**已绑定技能（须在本轮输出中体现其方法论与检查项）：**

${skillsBlock}`
        : agent.systemPrompt;

      const runInput = buildAgentInput({
        projectIdea: project.idea,
        previousOutputs: contextOutputs,
        projectMemoriesBlock:
          agent.code === "ceo" ? memoryBlock : undefined
      });

      const { data: run, error: runCreateError } = await getSupabaseAdmin()
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
        const llmStartedAt = Date.now();
        const llmResult = await callLLM({
          systemPrompt,
          userPrompt: runInput,
          temperature: 0.35
        });
        const durationMs = Date.now() - llmStartedAt;

        await insertUsageLog({
          projectId,
          agentRunId: run.id,
          agentCode: agent.code,
          durationMs,
          promptTokens: llmResult.usage.promptTokens,
          completionTokens: llmResult.usage.completionTokens,
          totalTokens: llmResult.usage.totalTokens,
          modelName: llmResult.model
        });

        await getSupabaseAdmin()
          .from("agent_runs")
          .update({
            output: llmResult.content,
            status: "completed",
            finished_at: new Date().toISOString()
          })
          .eq("id", run.id);

        contextOutputs.push(`## ${agent.name}\n\n${llmResult.content}`);
      } catch (agentError: unknown) {
        const message = getErrorMessage(agentError);
        await getSupabaseAdmin()
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

    const { error: completeError } = await getSupabaseAdmin()
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
    await getSupabaseAdmin()
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
  await getSupabaseAdmin()
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
  projectMemoriesBlock?: string;
}) {
  const previous =
    params.previousOutputs.length > 0
      ? params.previousOutputs.join("\n\n---\n\n")
      : "暂无，这是第一个智能体。";

  const memoriesSection =
    params.projectMemoriesBlock?.trim()
      ? `
---

**项目记忆（用户此前补充的约束与反馈，CEO 须纳入战略判断）：**

${params.projectMemoriesBlock}
`
      : "";

  return `
用户的 App 想法如下：

${params.projectIdea}
${memoriesSection}
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
