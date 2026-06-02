import { getSupabaseAdmin } from "./supabase";
import { agentConfigs, filterAgentsForApp } from "./agents";
import { callLLM } from "./llm";
import { buildFinalMarkdownReport } from "./markdown";
import {
  formatMemoriesForPrompt,
  listProjectMemoriesForWorkflow
} from "./memories/server";
import {
  formatUserProfileForPrompt,
  getUserProfileForWorkflow
} from "./user-profiles/server";
import {
  agentReceivesProjectMemories,
  agentReceivesUserProfile,
  memorySectionHintForAgent
} from "./agents/memory-bindings";
import { loadAgentSkillBindings } from "./agents/skill-bindings";
import { resolveAgentSkillInjection } from "./agents/resolve-skills";
import {
  formatSkillsForPrompt,
  getPublishedSkillsByCodes
} from "./skills/server";
import {
  deleteUsageLogsForProject,
  insertSkillInjectionLog,
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
  const ownerId =
    (project as { owner_id?: string | null }).owner_id ?? null;
  const userProfile = await getUserProfileForWorkflow(ownerId);
  const userProfileBlock = formatUserProfileForPrompt(userProfile);
  const agentSkillBindings = await loadAgentSkillBindings();
  const allSkillCodes = [
    ...new Set(Object.values(agentSkillBindings).flat())
  ];
  const publishedSkills = await getPublishedSkillsByCodes(allSkillCodes);
  const skillsByCode = new Map(publishedSkills.map((s) => [s.code, s]));

  try {
    const agents = filterAgentsForApp(project.idea);
    for (const agent of agents) {
      const injection = resolveAgentSkillInjection(
        agent.code,
        agentSkillBindings,
        skillsByCode
      );
      const agentSkills = injection.skills;
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
        projectMemoriesBlock: agentReceivesProjectMemories(agent.code)
          ? memoryBlock
          : undefined,
        memorySectionHint: agentReceivesProjectMemories(agent.code)
          ? memorySectionHintForAgent(agent.code)
          : undefined,
        userProfileBlock: agentReceivesUserProfile(agent.code)
          ? userProfileBlock
          : undefined
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

      await insertSkillInjectionLog({
        projectId,
        agentRunId: run.id,
        agentCode: agent.code,
        boundCodes: injection.boundCodes,
        injectedCodes: injection.injectedCodes,
        missingCodes: injection.missingCodes,
        skillNames: agentSkills.map((s) => ({
          code: s.code,
          name: s.name,
          version: s.version
        }))
      });

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

/** 断点续传：从失败项目的最后一个成功 Agent 继续 */
export async function resumeProjectWorkflow(projectId: string) {
  const { data: project } = await getSupabaseAdmin()
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .single();

  if (!project) throw new Error("项目不存在");
  if (project.status !== "failed") throw new Error("仅失败项目可续传");

  // 获取已完成的 Agent
  const { data: completedRuns } = await getSupabaseAdmin()
    .from("agent_runs")
    .select("agent_code, output")
    .eq("project_id", projectId)
    .eq("status", "completed")
    .order("created_at", { ascending: true });

  const completedCodes = new Set((completedRuns ?? []).map((r: Record<string, unknown>) => r.agent_code as string));
  const contextOutputs = (completedRuns ?? []).map((r: Record<string, unknown>) => `## ${r.agent_code}\n\n${r.output}`).filter(Boolean);

  const agents = filterAgentsForApp(project.idea);
  const remainingAgents = agents.filter((a) => !completedCodes.has(a.code));

  // 更新状态为 running
  await getSupabaseAdmin().from("projects").update({ status: "running", error_message: null, updated_at: new Date().toISOString() }).eq("id", projectId);

  // 获取记忆和技能
  const workflowMemories = await listProjectMemoriesForWorkflow(projectId);
  const memoryBlock = formatMemoriesForPrompt(workflowMemories);
  const agentSkillBindings = await loadAgentSkillBindings();
  const allSkillCodes = [...new Set(Object.values(agentSkillBindings).flat())];
  const publishedSkills = await getPublishedSkillsByCodes(allSkillCodes);
  const skillsByCode = new Map(publishedSkills.map((s) => [s.code, s]));

  try {
    for (const agent of remainingAgents) {
      const injection = resolveAgentSkillInjection(agent.code, agentSkillBindings, skillsByCode);
      const skillsBlock = formatSkillsForPrompt(injection.skills);
      const systemPrompt = skillsBlock ? `${agent.systemPrompt}\n\n---\n\n已绑定技能：\n${skillsBlock}` : agent.systemPrompt;

      const runInput = buildAgentInput({
        projectIdea: project.idea,
        previousOutputs: contextOutputs,
        projectMemoriesBlock: agentReceivesProjectMemories(agent.code) ? memoryBlock : undefined,
        memorySectionHint: agentReceivesProjectMemories(agent.code) ? memorySectionHintForAgent(agent.code) : undefined,
        userProfileBlock: undefined,
      });

      const { data: run } = await getSupabaseAdmin().from("agent_runs").insert({
        project_id: projectId, agent_code: agent.code, agent_name: agent.name, input: runInput, status: "running", started_at: new Date().toISOString()
      }).select("*").single();

      if (!run) throw new Error(`创建 Agent 运行记录失败：${agent.name}`);

      try {
        const result = await callLLM({ systemPrompt, userPrompt: runInput, temperature: 0.35 });
        await getSupabaseAdmin().from("agent_runs").update({ output: result.content, status: "completed", finished_at: new Date().toISOString() }).eq("id", run.id);
        contextOutputs.push(`## ${agent.name}\n\n${result.content}`);
      } catch (agentError) {
        await getSupabaseAdmin().from("agent_runs").update({ status: "failed", error_message: getErrorMessage(agentError), finished_at: new Date().toISOString() }).eq("id", run.id);
        throw agentError;
      }
    }

    const allOutputs = [...(completedRuns ?? []).map((r: Record<string, unknown>) => `## ${r.agent_code}\n\n${r.output}`), ...contextOutputs];
    const finalReport = buildFinalMarkdownReport({ title: project.title, idea: project.idea, sections: allOutputs });
    await getSupabaseAdmin().from("projects").update({ status: "completed", final_report: finalReport, error_message: null, updated_at: new Date().toISOString() }).eq("id", projectId);

    return { projectId, status: "completed" as const, resumed: true, skippedAgents: completedCodes.size };
  } catch (error) {
    await markProjectFailed(projectId, getErrorMessage(error));
    throw error;
  }
}

function buildAgentInput(params: {
  projectIdea: string;
  previousOutputs: string[];
  projectMemoriesBlock?: string;
  memorySectionHint?: string;
  userProfileBlock?: string;
}) {
  const previous =
    params.previousOutputs.length > 0
      ? params.previousOutputs.join("\n\n---\n\n")
      : "暂无，这是第一个智能体。";

  const memoryHint =
    params.memorySectionHint?.trim() || "须在本轮输出中体现";
  const memoriesSection =
    params.projectMemoriesBlock?.trim()
      ? `
---

**项目记忆（用户此前补充的约束与反馈，${memoryHint}）：**

${params.projectMemoriesBlock}
`
      : "";

  const userProfileSection =
    params.userProfileBlock?.trim()
      ? `
---

**用户全局画像（跨项目偏好，须在战略/PRD 中体现）：**

${params.userProfileBlock}
`
      : "";

  return `
用户的 App 想法如下：

${params.projectIdea}
${memoriesSection}${userProfileSection}
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
