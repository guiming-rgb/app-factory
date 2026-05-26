import { getSupabaseForUserRead } from "@/lib/supabase/request-client";
import { isAuthEnabled } from "@/lib/auth-config";

export type Skill = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  category: string | null;
  input_schema: Record<string, unknown>;
  workflow_schema: Record<string, unknown>;
  tools_required: unknown[];
  quality_checks: unknown[];
  version: string;
  status: string;
  created_at: string;
  updated_at: string;
};

const SKILL_LIST_FIELDS =
  "id, code, name, description, category, input_schema, workflow_schema, tools_required, quality_checks, version, status, created_at, updated_at";

export async function listPublishedSkills(): Promise<Skill[] | null> {
  if (isAuthEnabled()) {
    const client = await getSupabaseForUserRead();
    if (!client) {
      return [];
    }
    const { data, error } = await client
      .from("skills")
      .select(SKILL_LIST_FIELDS)
      .eq("status", "published")
      .order("category", { ascending: true })
      .order("name", { ascending: true });
    if (error) {
      console.error("[listPublishedSkills]", error.message);
      return null;
    }
    return (data ?? []) as Skill[];
  }

  const { getSupabaseAdmin } = await import("@/lib/supabase");
  const { data, error } = await getSupabaseAdmin()
    .from("skills")
    .select(SKILL_LIST_FIELDS)
    .eq("status", "published")
    .order("category", { ascending: true })
    .order("name", { ascending: true });
  if (error) {
    console.error("[listPublishedSkills]", error.message);
    return null;
  }
  return (data ?? []) as Skill[];
}

/** 工作流：按 code 批量读取已发布技能（Service Role） */
export async function getPublishedSkillsByCodes(
  codes: string[]
): Promise<Skill[]> {
  const unique = [...new Set(codes.map((c) => c.trim()).filter(Boolean))];
  if (!unique.length) {
    return [];
  }

  const { getSupabaseAdmin } = await import("@/lib/supabase");
  const { data, error } = await getSupabaseAdmin()
    .from("skills")
    .select(SKILL_LIST_FIELDS)
    .eq("status", "published")
    .in("code", unique);

  if (error) {
    console.warn("[getPublishedSkillsByCodes]", error.message);
    return [];
  }
  return (data ?? []) as Skill[];
}

/** v5-4：工作流 prompt 注入 */
export function formatSkillsForPrompt(skills: Skill[]): string {
  if (!skills.length) {
    return "";
  }
  return skills
    .map(
      (s) =>
        `- **${s.name}** (\`${s.code}\`, v${s.version})${s.description ? `：${s.description}` : ""}`
    )
    .join("\n");
}
