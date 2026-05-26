import { getSupabaseAdmin } from "@/lib/supabase";

export type AgentSkillBindings = Record<string, string[]>;

function parseSkillIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw
    .map((item) => String(item ?? "").trim())
    .filter(Boolean);
}

/** 工作流：从 DB 读取各 Agent 绑定的 skill code 列表 */
export async function loadAgentSkillBindings(): Promise<AgentSkillBindings> {
  const { data, error } = await getSupabaseAdmin()
    .from("agents")
    .select("code, skill_ids");

  if (error) {
    console.warn("[loadAgentSkillBindings]", error.message);
    return {};
  }

  const bindings: AgentSkillBindings = {};
  for (const row of data ?? []) {
    const code = String(row.code ?? "").trim();
    if (!code) {
      continue;
    }
    bindings[code] = parseSkillIds(row.skill_ids);
  }
  return bindings;
}
