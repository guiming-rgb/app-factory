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
  codegen_snippets: unknown[];
  version: string;
  status: string;
  created_at: string;
  updated_at: string;
};

export type SkillStatus = "draft" | "published";

const SKILL_LIST_FIELDS =
  "id, code, name, description, category, input_schema, workflow_schema, tools_required, quality_checks, codegen_snippets, version, status, created_at, updated_at";

const CODE_PATTERN = /^[a-z][a-z0-9_]*$/;

function normalizeSkillCode(raw: string): string | null {
  const code = raw.trim().toLowerCase();
  if (!code || code.length > 48 || !CODE_PATTERN.test(code)) {
    return null;
  }
  return code;
}

function normalizeSkillStatus(raw: unknown): SkillStatus | null {
  if (raw === "draft" || raw === "published") {
    return raw;
  }
  return null;
}

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

/** v5-8：管理端列出全部技能（含 draft） */
export async function listAllSkillsForManage(): Promise<Skill[] | null> {
  const { getSupabaseAdmin } = await import("@/lib/supabase");
  const { data, error } = await getSupabaseAdmin()
    .from("skills")
    .select(SKILL_LIST_FIELDS)
    .order("status", { ascending: true })
    .order("category", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    console.error("[listAllSkillsForManage]", error.message);
    return null;
  }
  return (data ?? []) as Skill[];
}

export async function createSkillDraft(input: {
  code: string;
  name: string;
  description?: string;
  category?: string;
  version?: string;
  status?: SkillStatus;
}): Promise<{ skill: Skill } | { error: string }> {
  const code = normalizeSkillCode(input.code);
  if (!code) {
    return { error: "code 须为小写英文+下划线，以字母开头" };
  }
  const name = input.name.trim();
  if (!name) {
    return { error: "name 不能为空" };
  }
  const status = input.status ?? "draft";
  if (!normalizeSkillStatus(status)) {
    return { error: "status 只能是 draft 或 published" };
  }

  const { getSupabaseAdmin } = await import("@/lib/supabase");
  const { data, error } = await getSupabaseAdmin()
    .from("skills")
    .insert({
      code,
      name: name.slice(0, 128),
      description: input.description?.trim() || null,
      category: input.category?.trim() || null,
      version: (input.version?.trim() || "1.0.0").slice(0, 32),
      status
    })
    .select(SKILL_LIST_FIELDS)
    .single();

  if (error) {
    if (/duplicate|unique/i.test(error.message)) {
      return { error: `code 已存在：${code}` };
    }
    return { error: error.message };
  }
  return { skill: data as Skill };
}

export async function updateSkillForManage(
  id: string,
  patch: {
    name?: string;
    description?: string | null;
    category?: string | null;
    version?: string;
    status?: SkillStatus;
  }
): Promise<{ skill: Skill } | { error: string }> {
  const row: Record<string, unknown> = {
    updated_at: new Date().toISOString()
  };

  if (patch.name !== undefined) {
    const name = patch.name.trim();
    if (!name) {
      return { error: "name 不能为空" };
    }
    row.name = name.slice(0, 128);
  }
  if (patch.description !== undefined) {
    row.description = patch.description?.trim() || null;
  }
  if (patch.category !== undefined) {
    row.category = patch.category?.trim() || null;
  }
  if (patch.version !== undefined) {
    row.version = patch.version.trim().slice(0, 32) || "1.0.0";
  }
  if (patch.status !== undefined) {
    if (!normalizeSkillStatus(patch.status)) {
      return { error: "status 只能是 draft 或 published" };
    }
    row.status = patch.status;
  }

  const { getSupabaseAdmin } = await import("@/lib/supabase");
  const { data, error } = await getSupabaseAdmin()
    .from("skills")
    .update(row)
    .eq("id", id)
    .select(SKILL_LIST_FIELDS)
    .maybeSingle();

  if (error) {
    return { error: error.message };
  }
  if (!data) {
    return { error: "技能不存在" };
  }
  return { skill: data as Skill };
}

export async function publishSkill(
  id: string
): Promise<{ skill: Skill } | { error: string }> {
  return updateSkillForManage(id, { status: "published" });
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
