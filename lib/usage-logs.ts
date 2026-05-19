import { getSupabaseAdmin } from "./supabase";

export type UsageLogInsert = {
  projectId: string;
  agentRunId?: string;
  agentCode?: string;
  eventType?: "llm_call" | "workflow_total";
  durationMs?: number;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  modelName?: string;
};

export type ProjectUsageSummary = {
  llmCallCount: number;
  totalDurationMs: number;
  totalTokens: number;
  byAgent: Array<{
    agentCode: string;
    durationMs: number;
    totalTokens: number;
  }>;
};

function isUsageLogsTableMissing(message: string) {
  return /usage_logs|schema cache|relation.*does not exist/i.test(message);
}

export async function deleteUsageLogsForProject(projectId: string) {
  const { error } = await getSupabaseAdmin()
    .from("usage_logs")
    .delete()
    .eq("project_id", projectId);

  if (error) {
    if (isUsageLogsTableMissing(error.message)) {
      console.warn("[deleteUsageLogsForProject] 表未就绪，跳过");
      return;
    }
    throw new Error(`清理用量记录失败：${error.message}`);
  }
}

export async function insertUsageLog(row: UsageLogInsert) {
  const { error } = await getSupabaseAdmin().from("usage_logs").insert({
    project_id: row.projectId,
    agent_run_id: row.agentRunId ?? null,
    agent_code: row.agentCode ?? null,
    event_type: row.eventType ?? "llm_call",
    duration_ms: row.durationMs ?? null,
    prompt_tokens: row.promptTokens ?? null,
    completion_tokens: row.completionTokens ?? null,
    total_tokens: row.totalTokens ?? null,
    model_name: row.modelName ?? null
  });

  if (error) {
    console.warn("[insertUsageLog]", error.message);
  }
}

export async function getProjectUsageSummary(
  projectId: string
): Promise<ProjectUsageSummary | null> {
  const { data, error } = await getSupabaseAdmin()
    .from("usage_logs")
    .select(
      "agent_code, event_type, duration_ms, total_tokens, prompt_tokens, completion_tokens"
    )
    .eq("project_id", projectId)
    .eq("event_type", "llm_call")
    .order("created_at", { ascending: true });

  if (error) {
    if (error.message.includes("usage_logs")) {
      return null;
    }
    console.error("[getProjectUsageSummary]", error.message);
    return null;
  }

  const rows = data ?? [];
  const byAgentMap = new Map<
    string,
    { agentCode: string; durationMs: number; totalTokens: number }
  >();

  let totalDurationMs = 0;
  let totalTokens = 0;

  for (const row of rows) {
    const durationMs = row.duration_ms ?? 0;
    const tokens =
      row.total_tokens ??
      (row.prompt_tokens ?? 0) + (row.completion_tokens ?? 0);

    totalDurationMs += durationMs;
    totalTokens += tokens;

    const code = row.agent_code ?? "unknown";
    const existing = byAgentMap.get(code) ?? {
      agentCode: code,
      durationMs: 0,
      totalTokens: 0
    };
    existing.durationMs += durationMs;
    existing.totalTokens += tokens;
    byAgentMap.set(code, existing);
  }

  return {
    llmCallCount: rows.length,
    totalDurationMs,
    totalTokens,
    byAgent: [...byAgentMap.values()]
  };
}
