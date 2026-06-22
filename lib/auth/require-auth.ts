import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getApiUser, unauthorizedResponse, projectOwnedByUser } from "./api-user";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * 项目鉴权中间件 — 替代各路由里重复的 getApiUser + projectOwnedByUser。
 *
 * 用法：
 *   const auth = await requireProjectOwner(projectId);
 *   if (auth.error) return auth.error;
 *   // auth.user, auth.project 可直接用
 */
export async function requireProjectOwner(projectId: string): Promise<
  | { error: NextResponse; user?: undefined; project?: undefined; supabase?: undefined }
  | { error?: undefined; user: { id: string }; project: Record<string, unknown>; supabase: SupabaseClient }
> {
  const user = await getApiUser();
  if (!user) return { error: unauthorizedResponse() };

  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: NextResponse.json({ error: "服务不可用" }, { status: 503 }) };

  const { data: project, error } = await supabase
    .from("projects")
    .select("id, owner_id, status")
    .eq("id", projectId)
    .single();

  if (error || !project) {
    return { error: NextResponse.json({ error: "项目不存在" }, { status: 404 }) };
  }

  if (!projectOwnedByUser(project, user.id)) {
    return { error: NextResponse.json({ error: "无权访问该项目" }, { status: 403 }) };
  }

  return { user: { id: user.id }, project: project as Record<string, unknown>, supabase };
}

/**
 * 纯鉴权中间件 — 只需要登录态，不检查项目归属。
 * 用于 /api/user/*, /api/admin, /api/github/oauth/* 等。
 */
export async function requireAuth(): Promise<
  | { error: NextResponse; user?: undefined }
  | { error?: undefined; user: { id: string; email?: string } }
> {
  const user = await getApiUser();
  if (!user) return { error: unauthorizedResponse() };
  return { user: { id: user.id, email: user.email } };
}
