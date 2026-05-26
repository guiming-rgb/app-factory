import type { SupabaseClient } from "@supabase/supabase-js";

import { getSupabaseAdmin } from "./supabase";

export type UsageLogInsert = {
  projectId: string;
  agentRunId?: string;
  agentCode?: string;
  eventType?: "llm_call" | "workflow_total" | "skill_injection";
  durationMs?: number;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  modelName?: string;
  metadata?: Record<string, unknown>;
};

export type SkillInjectionLogView = {
  id: string;
  agentRunId: string | null;
  agentCode: string;
  boundCodes: string[];
  injectedCodes: string[];
  missingCodes: string[];
  skillNames: Array<{ code: string; name: string; version: string }>;
  createdAt: string;
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
  skillInjections: SkillInjectionLogView[];
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
    model_name: row.modelName ?? null,
    metadata: row.metadata ?? {}
  });

  if (error) {
    console.warn("[insertUsageLog]", error.message);
  }
}

/** v5-9：记录本轮 Agent 实际注入的已发布技能 */
export async function insertSkillInjectionLog(input: {
  projectId: string;
  agentRunId: string;
  agentCode: string;
  boundCodes: string[];
  injectedCodes: string[];
  missingCodes: string[];
  skillNames: Array<{ code: string; name: string; version: string }>;
}) {
  await insertUsageLog({
    projectId: input.projectId,
    agentRunId: input.agentRunId,
    agentCode: input.agentCode,
    eventType: "skill_injection",
    metadata: {
      bound_skill_codes: input.boundCodes,
      injected_skill_codes: input.injectedCodes,
      missing_skill_codes: input.missingCodes,
      skill_names: input.skillNames
    }
  });
}

function parseStringArray(raw: unknown): string[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw.map((item) => String(item ?? "").trim()).filter(Boolean);
}

function parseSkillInjectionRow(row: {
  id: string;
  agent_run_id: string | null;
  agent_code: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}): SkillInjectionLogView {
  const meta = (row.metadata ?? {}) as Record<string, unknown>;
  const skillNamesRaw = meta.skill_names;
  const skillNames = Array.isArray(skillNamesRaw)
    ? skillNamesRaw
        .map((item) => {
          if (!item || typeof item !== "object") {
            return null;
          }
          const o = item as Record<string, unknown>;
          const code = String(o.code ?? "").trim();
          if (!code) {
            return null;
          }
          return {
            code,
            name: String(o.name ?? code),
            version: String(o.version ?? "1.0.0")
          };
        })
        .filter((x): x is { code: string; name: string; version: string } => !!x)
    : [];

  return {
    id: row.id,
    agentRunId: row.agent_run_id,
    agentCode: row.agent_code ?? "unknown",
    boundCodes: parseStringArray(meta.bound_skill_codes),
    injectedCodes: parseStringArray(meta.injected_skill_codes),
    missingCodes: parseStringArray(meta.missing_skill_codes),
    skillNames,
    createdAt: row.created_at
  };
}

async function listSkillInjectionLogs(
  projectId: string,
  client?: SupabaseClient
): Promise<SkillInjectionLogView[]> {
  const db = client ?? getSupabaseAdmin();
  const { data, error } = await db
    .from("usage_logs")
    .select("id, agent_run_id, agent_code, metadata, created_at")
    .eq("project_id", projectId)
    .eq("event_type", "skill_injection")
    .order("created_at", { ascending: true });

  if (error) {
    if (isUsageLogsTableMissing(error.message)) {
      return [];
    }
    console.warn("[listSkillInjectionLogs]", error.message);
    return [];
  }

  return (data ?? []).map((row) =>
    parseSkillInjectionRow(
      row as {
        id: string;
        agent_run_id: string | null;
        agent_code: string | null;
        metadata: Record<string, unknown> | null;
        created_at: string;
      }
    )
  );
}

export async function getProjectUsageSummary(
  projectId: string,
  client?: SupabaseClient
): Promise<ProjectUsageSummary | null> {
  const db = client ?? getSupabaseAdmin();
  const { data, error } = await db
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
    byAgent: [...byAgentMap.values()],
    skillInjections: await listSkillInjectionLogs(projectId, client)
  };
}
