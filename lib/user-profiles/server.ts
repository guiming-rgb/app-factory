import { getSupabaseForUserRead, getSupabaseForUserRequest } from "@/lib/supabase/request-client";
import { isAuthEnabled } from "@/lib/auth-config";

export type UserProfile = {
  user_id: string;
  display_name: string | null;
  role_hint: string | null;
  summary: string | null;
  preferences: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

const MAX_SUMMARY = 2000;
const MAX_DISPLAY_NAME = 80;

export function validateUserProfilePatch(input: {
  displayName?: unknown;
  roleHint?: unknown;
  summary?: unknown;
}): { ok: true; patch: Partial<UserProfile> } | { ok: false; error: string } {
  const patch: Partial<UserProfile> = {};

  if (input.displayName !== undefined) {
    const name = String(input.displayName ?? "").trim();
    if (name.length > MAX_DISPLAY_NAME) {
      return { ok: false, error: `显示名不能超过 ${MAX_DISPLAY_NAME} 字` };
    }
    patch.display_name = name || null;
  }

  if (input.roleHint !== undefined) {
    patch.role_hint = String(input.roleHint ?? "").trim().slice(0, 120) || null;
  }

  if (input.summary !== undefined) {
    const summary = String(input.summary ?? "").trim();
    if (summary.length > MAX_SUMMARY) {
      return { ok: false, error: `画像摘要不能超过 ${MAX_SUMMARY} 字` };
    }
    patch.summary = summary || null;
  }

  return { ok: true, patch };
}

export async function getUserProfile(
  userId: string
): Promise<UserProfile | null> {
  if (isAuthEnabled()) {
    const client = await getSupabaseForUserRead();
    if (!client) return null;
    const { data, error } = await client
      .from("user_profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) {
      if (/user_profiles|does not exist/i.test(error.message)) return null;
      throw new Error(error.message);
    }
    return (data as UserProfile | null) ?? null;
  }

  const { getSupabaseAdmin } = await import("@/lib/supabase");
  const { data, error } = await getSupabaseAdmin()
    .from("user_profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) return null;
  return (data as UserProfile | null) ?? null;
}

export async function upsertUserProfile(input: {
  userId: string;
  displayName?: string | null;
  roleHint?: string | null;
  summary?: string | null;
}): Promise<UserProfile | { error: string }> {
  const row = {
    user_id: input.userId,
    display_name: input.displayName ?? null,
    role_hint: input.roleHint ?? null,
    summary: input.summary ?? null,
    updated_at: new Date().toISOString()
  };

  if (isAuthEnabled()) {
    const client = await getSupabaseForUserRequest();
    const { data, error } = await client
      .from("user_profiles")
      .upsert(row, { onConflict: "user_id" })
      .select("*")
      .single();
    if (error || !data) {
      return { error: error?.message ?? "保存用户画像失败" };
    }
    return data as UserProfile;
  }

  const { getSupabaseAdmin } = await import("@/lib/supabase");
  const { data, error } = await getSupabaseAdmin()
    .from("user_profiles")
    .upsert(row, { onConflict: "user_id" })
    .select("*")
    .single();
  if (error || !data) {
    return { error: error?.message ?? "保存用户画像失败" };
  }
  return data as UserProfile;
}

/** V5-10：工作流注入（Service Role） */
export async function getUserProfileForWorkflow(
  userId: string | null | undefined
): Promise<UserProfile | null> {
  if (!userId) return null;
  const { getSupabaseAdmin } = await import("@/lib/supabase");
  const { data, error } = await getSupabaseAdmin()
    .from("user_profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) {
    if (/user_profiles|does not exist/i.test(error.message)) return null;
    console.warn("[getUserProfileForWorkflow]", error.message);
    return null;
  }
  return (data as UserProfile | null) ?? null;
}

export function formatUserProfileForPrompt(profile: UserProfile | null): string {
  if (!profile) return "";
  const parts: string[] = [];
  if (profile.display_name?.trim()) {
    parts.push(`称呼/显示名：${profile.display_name.trim()}`);
  }
  if (profile.role_hint?.trim()) {
    parts.push(`角色：${profile.role_hint.trim()}`);
  }
  if (profile.summary?.trim()) {
    parts.push(`全局偏好与背景：${profile.summary.trim().slice(0, 800)}`);
  }
  if (!parts.length) return "";
  return parts.join("\n");
}
