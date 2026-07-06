import { getSupabaseAdmin } from "./supabase";
import { filterAgentsForApp, getAgentConfig } from "./agents";
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
 * 成功后由 Inngest 按 Agent 分步调用 runProjectWorkflowAgent + finalizeProjectWorkflow。
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

  // 清理旧的 agent_runs / usage_logs（仅失败或强制重新生成时）
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

  // ✅ TOCTOU 防竞态：使用条件 UPDATE，仅允许 pending/failed/completed 状态转换到 running
  // 如果状态已变为 running（被并发请求抢占），affected rows 为 0
  const allowedPreviousStatuses = ["pending", "failed", "completed"];
  // { count: 'exact' } 必须传，否则 updatedCount 恒为 null
  const { error: updateError, count: updatedCount } = await getSupabaseAdmin()
    .from("projects")
    .update({
      status: "running",
      final_report: null,
      error_message: null,
      updated_at: new Date().toISOString()
    }, { count: 'exact' })
    .eq("id", projectId)
    .in("status", allowedPreviousStatuses);

  if (updateError) {
    throw new Error(`更新项目状态失败：${updateError.message}`);
  }

  // 如果没有行被更新，说明状态被并发请求改变了
  if (updatedCount === 0) {
    // 重读状态，看是被谁抢了
    const { data: recheck } = await getSupabaseAdmin()
      .from("projects")
      .select("status")
      .eq("id", projectId)
      .single();
    if (recheck?.status === "running") {
      throw new Error(WORKFLOW_ERROR_ALREADY_RUNNING);
    }
    throw new Error("项目状态已变更，请刷新后重试");
  }

  return { projectId };
}

/**
 * 同步执行完整工作流（测试 / 脚本用）。生产路径由 Inngest 分步调用
 * runProjectWorkflowAgent + finalizeProjectWorkflow。
 */
export async function executeProjectWorkflow(projectId: string) {
  const plan = await getProjectWorkflowPlan(projectId);

  if (plan.action === "skip") {
    return {
      projectId,
      status: "skipped" as const,
      reason: plan.reason,
    };
  }

  try {
    for (const agentCode of plan.agentCodes) {
      await runProjectWorkflowAgent(projectId, agentCode);
    }

    const final = await finalizeProjectWorkflow(projectId);
    if (final.status === "skipped") {
      return {
        projectId,
        status: "skipped" as const,
        reason: final.reason,
      };
    }

    return { projectId, status: "completed" as const };
  } catch (error: unknown) {
    await markProjectFailed(projectId, getErrorMessage(error));
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
    .eq("id", projectId)
    .eq("status", "running");
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

    const finalReport = buildFinalMarkdownReport({ title: project.title, idea: project.idea, sections: contextOutputs });
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

type WorkflowSkip = {
  action: "skip";
  reason: string;
};

type WorkflowRunPlan = {
  action: "run";
  agentCodes: string[];
};

/** Inngest W-03: 解析工作流计划（跳过已完成 / 非 running） */
export async function getProjectWorkflowPlan(
  projectId: string,
): Promise<WorkflowSkip | WorkflowRunPlan> {
  const { data: project, error: projectError } = await getSupabaseAdmin()
    .from("projects")
    .select("id, status, idea")
    .eq("id", projectId)
    .single();

  if (projectError || !project) {
    throw new Error("项目不存在");
  }

  if (project.status === "completed") {
    return {
      action: "skip",
      reason: "项目已完成，跳过重复执行（幂等）",
    };
  }

  if (project.status !== "running") {
    return {
      action: "skip",
      reason: `项目当前状态为 ${project.status}，非 running，跳过后台任务`,
    };
  }

  return {
    action: "run",
    agentCodes: filterAgentsForApp(project.idea ?? "").map((a) => a.code),
  };
}

async function loadPriorAgentOutputs(
  projectId: string,
  agentCodes: string[],
): Promise<string[]> {
  const outputs: string[] = [];
  for (const code of agentCodes) {
    const agent = getAgentConfig(code);
    const { data: run } = await getSupabaseAdmin()
      .from("agent_runs")
      .select("output, agent_name")
      .eq("project_id", projectId)
      .eq("agent_code", code)
      .eq("status", "completed")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (run?.output) {
      outputs.push(
        `## ${(run.agent_name as string) ?? agent?.name ?? code}\n\n${run.output}`,
      );
    }
  }
  return outputs;
}

/** Inngest W-03: 执行单个 Agent（幂等 — 已完成则跳过） */
export async function runProjectWorkflowAgent(
  projectId: string,
  agentCode: string,
): Promise<{ agentCode: string; status: "completed" | "skipped"; reason?: string }> {
  const plan = await getProjectWorkflowPlan(projectId);
  if (plan.action === "skip") {
    return { agentCode, status: "skipped", reason: plan.reason };
  }

  const { data: project } = await getSupabaseAdmin()
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .single();

  if (!project) throw new Error("项目不存在");

  const agents = filterAgentsForApp(project.idea);
  const agentIndex = agents.findIndex((a) => a.code === agentCode);
  if (agentIndex < 0) throw new Error(`未知 Agent: ${agentCode}`);
  const agent = agents[agentIndex];

  const { data: latestDone } = await getSupabaseAdmin()
    .from("agent_runs")
    .select("id, output")
    .eq("project_id", projectId)
    .eq("agent_code", agentCode)
    .eq("status", "completed")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestDone?.output) {
    return { agentCode, status: "skipped", reason: "Agent 已完成" };
  }

  const priorCodes = agents.slice(0, agentIndex).map((a) => a.code);
  const contextOutputs = await loadPriorAgentOutputs(projectId, priorCodes);

  const workflowMemories = await listProjectMemoriesForWorkflow(projectId);
  const memoryBlock = formatMemoriesForPrompt(workflowMemories);
  const ownerId = (project as { owner_id?: string | null }).owner_id ?? null;
  const userProfile = await getUserProfileForWorkflow(ownerId);
  const userProfileBlock = formatUserProfileForPrompt(userProfile);
  const agentSkillBindings = await loadAgentSkillBindings();
  const allSkillCodes = [...new Set(Object.values(agentSkillBindings).flat())];
  const publishedSkills = await getPublishedSkillsByCodes(allSkillCodes);
  const skillsByCode = new Map(publishedSkills.map((s) => [s.code, s]));

  const injection = resolveAgentSkillInjection(
    agent.code,
    agentSkillBindings,
    skillsByCode,
  );
  const skillsBlock = formatSkillsForPrompt(injection.skills);
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
      : undefined,
  });

  const { data: run, error: runCreateError } = await getSupabaseAdmin()
    .from("agent_runs")
    .insert({
      project_id: projectId,
      agent_code: agent.code,
      agent_name: agent.name,
      input: runInput,
      status: "running",
      started_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (runCreateError || !run) {
    throw new Error(
      `创建 Agent 运行记录失败：${runCreateError?.message || agent.name}`,
    );
  }

  await insertSkillInjectionLog({
    projectId,
    agentRunId: run.id,
    agentCode: agent.code,
    boundCodes: injection.boundCodes,
    injectedCodes: injection.injectedCodes,
    missingCodes: injection.missingCodes,
    skillNames: injection.skills.map((s) => ({
      code: s.code,
      name: s.name,
      version: s.version,
    })),
  });

  const llmStartedAt = Date.now();
  try {
    const llmResult = await callLLM({
      systemPrompt,
      userPrompt: runInput,
      temperature: 0.35,
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
      modelName: llmResult.model,
    });

    await getSupabaseAdmin()
      .from("agent_runs")
      .update({
        output: llmResult.content,
        status: "completed",
        finished_at: new Date().toISOString(),
      })
      .eq("id", run.id);

    return { agentCode, status: "completed" };
  } catch (agentError: unknown) {
    const message = getErrorMessage(agentError);
    await getSupabaseAdmin()
      .from("agent_runs")
      .update({
        status: "failed",
        error_message: message,
        finished_at: new Date().toISOString(),
      })
      .eq("id", run.id);
    throw agentError;
  }
}

/** Inngest W-03: 汇总报告并标记项目完成 */
export async function finalizeProjectWorkflow(projectId: string) {
  const plan = await getProjectWorkflowPlan(projectId);
  if (plan.action === "skip") {
    return { status: "skipped" as const, reason: plan.reason };
  }

  const { data: project } = await getSupabaseAdmin()
    .from("projects")
    .select("title, idea, status")
    .eq("id", projectId)
    .single();

  if (!project) throw new Error("项目不存在");
  if (project.status !== "running") {
    return {
      status: "skipped" as const,
      reason: `项目状态 ${project.status}，跳过 finalize`,
    };
  }

  const agentCodes = filterAgentsForApp(project.idea ?? "").map((a) => a.code);
  const sections = await loadPriorAgentOutputs(projectId, agentCodes);
  const finalReport = buildFinalMarkdownReport({
    title: project.title,
    idea: project.idea,
    sections,
  });

  const { data: updated, error: completeError } = await getSupabaseAdmin()
    .from("projects")
    .update({
      status: "completed",
      final_report: finalReport,
      error_message: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", projectId)
    .eq("status", "running")
    .select("id")
    .maybeSingle();

  if (completeError) {
    throw new Error(`更新最终报告失败：${completeError.message}`);
  }

  if (!updated) {
    return {
      status: "skipped" as const,
      reason: "项目已非 running 状态，跳过 finalize",
    };
  }

  return { status: "completed" as const };
}
