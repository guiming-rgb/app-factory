import type { User } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import { getApiUser, unauthorizedResponse } from "@/lib/auth/api-user";
import { isAuthEnabled } from "@/lib/auth-config";
import { getSupabaseAdmin } from "@/lib/supabase";
import {
  getSupabaseForUserRead,
  getSupabaseForUserRequest
} from "@/lib/supabase/request-client";

function ensureOwnerIdInSelect(select: string): string {
  if (select === "*") {
    return select;
  }
  const parts = select.split(",").map((s) => s.trim());
  if (!parts.includes("owner_id")) {
    parts.push("owner_id");
  }
  return parts.join(", ");
}

type AccessDenied = { ok: false; response: NextResponse };
type AccessGranted<T> = { ok: true; user: User | null; project: T };

/**
 * Auth 启用时校验 session + RLS；通过返回 null，否则返回应直接 return 的 Response。
 */
export async function guardProjectAccess(
  projectId: string
): Promise<NextResponse | null> {
  const user = await getApiUser();
  if (isAuthEnabled() && !user) {
    return unauthorizedResponse();
  }
  if (!isAuthEnabled()) {
    return null;
  }

  const supabase = await getSupabaseForUserRead();
  if (!supabase) {
    return unauthorizedResponse();
  }

  const { data: project, error } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .maybeSingle();

  if (error || !project) {
    return NextResponse.json({ error: "项目不存在" }, { status: 404 });
  }
  return null;
}

/** 单次查询：取项目字段；Auth 启用时走 RLS session client */
export async function fetchProjectWithAccess<T = Record<string, unknown>>(
  projectId: string,
  select: string
): Promise<AccessDenied | AccessGranted<T>> {
  const user = await getApiUser();
  if (isAuthEnabled() && !user) {
    return { ok: false, response: unauthorizedResponse() };
  }

  const supabase = isAuthEnabled()
    ? await getSupabaseForUserRead()
    : getSupabaseAdmin();

  if (isAuthEnabled() && !supabase) {
    return { ok: false, response: unauthorizedResponse() };
  }

  const selectFields = isAuthEnabled() ? select : ensureOwnerIdInSelect(select);

  const { data: project, error } = await supabase!
    .from("projects")
    .select(selectFields)
    .eq("id", projectId)
    .maybeSingle();

  if (error || !project) {
    return {
      ok: false,
      response: NextResponse.json({ error: "项目不存在" }, { status: 404 })
    };
  }

  return { ok: true, user, project: project as T };
}

export { getSupabaseForUserRead, getSupabaseForUserRequest };
