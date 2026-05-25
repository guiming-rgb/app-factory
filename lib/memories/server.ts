import { getSupabaseForUserRead, getSupabaseForUserRequest } from "@/lib/supabase/request-client";
import { isAuthEnabled } from "@/lib/auth-config";

export type ProjectMemory = {
  id: string;
  user_id: string | null;
  project_id: string | null;
  memory_type: string;
  content: string;
  importance: number;
  created_at: string;
  updated_at: string;
};

const MEMORY_TYPES = new Set(["note", "constraint", "feedback"]);
const MAX_CONTENT = 2000;

export function normalizeMemoryType(raw: unknown): string {
  const t = String(raw ?? "note").trim();
  return MEMORY_TYPES.has(t) ? t : "note";
}

export function validateMemoryContent(content: unknown): string | null {
  const text = String(content ?? "").trim();
  if (!text) {
    return "记忆内容不能为空";
  }
  if (text.length > MAX_CONTENT) {
    return `记忆内容不能超过 ${MAX_CONTENT} 字`;
  }
  return null;
}

export async function listProjectMemories(
  projectId: string
): Promise<ProjectMemory[] | null> {
  if (isAuthEnabled()) {
    const client = await getSupabaseForUserRead();
    if (!client) {
      return [];
    }
    const { data, error } = await client
      .from("memories")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) {
      console.error("[listProjectMemories]", error.message);
      return null;
    }
    return (data ?? []) as ProjectMemory[];
  }

  const { getSupabaseAdmin } = await import("@/lib/supabase");
  const { data, error } = await getSupabaseAdmin()
    .from("memories")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) {
    console.error("[listProjectMemories]", error.message);
    return null;
  }
  return (data ?? []) as ProjectMemory[];
}

export async function createProjectMemory(input: {
  projectId: string;
  userId: string | null;
  content: string;
  memoryType: string;
  importance?: number;
}): Promise<{ memory: ProjectMemory } | { error: string }> {
  const importance = Math.min(
    5,
    Math.max(1, Number(input.importance ?? 1) || 1)
  );

  if (isAuthEnabled()) {
    const client = await getSupabaseForUserRequest();
    const { data, error } = await client
      .from("memories")
      .insert({
        project_id: input.projectId,
        user_id: input.userId,
        memory_type: input.memoryType,
        content: input.content,
        importance
      })
      .select("*")
      .single();
    if (error || !data) {
      return { error: error?.message ?? "创建记忆失败" };
    }
    return { memory: data as ProjectMemory };
  }

  const { getSupabaseAdmin } = await import("@/lib/supabase");
  const { data, error } = await getSupabaseAdmin()
    .from("memories")
    .insert({
      project_id: input.projectId,
      user_id: input.userId,
      memory_type: input.memoryType,
      content: input.content,
      importance
    })
    .select("*")
    .single();
  if (error || !data) {
    return { error: error?.message ?? "创建记忆失败" };
  }
  return { memory: data as ProjectMemory };
}

export async function deleteProjectMemory(
  projectId: string,
  memoryId: string
): Promise<{ ok: true } | { error: string }> {
  const client = isAuthEnabled()
    ? await getSupabaseForUserRequest()
    : (await import("@/lib/supabase")).getSupabaseAdmin();

  const { data, error } = await client
    .from("memories")
    .delete()
    .eq("id", memoryId)
    .eq("project_id", projectId)
    .select("id")
    .maybeSingle();

  if (error) {
    return { error: error.message };
  }
  if (!data) {
    return { error: "记忆不存在或无权删除" };
  }
  return { ok: true };
}

/** v5-2 预留：工作流注入用 */
export function formatMemoriesForPrompt(memories: ProjectMemory[], limit = 5): string {
  const slice = memories.slice(0, limit);
  if (!slice.length) {
    return "";
  }
  return slice
    .map(
      (m, i) =>
        `${i + 1}. [${m.memory_type}] ${m.content.slice(0, 400)}`
    )
    .join("\n");
}
