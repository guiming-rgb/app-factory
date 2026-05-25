import type { User } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import { isAuthEnabled } from "@/lib/auth-config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/** API / Server：当前登录用户；Auth 未启用时返回 null */
export async function getApiUser(): Promise<User | null> {
  if (!isAuthEnabled()) {
    return null;
  }
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return null;
  }
  const {
    data: { user }
  } = await supabase.auth.getUser();
  return user;
}

export function unauthorizedResponse() {
  return NextResponse.json({ error: "请先登录" }, { status: 401 });
}

/** 项目是否属于当前用户（Auth 未启用时一律 true） */
export function projectOwnedByUser(
  project: { owner_id?: string | null },
  userId: string | null
): boolean {
  if (!isAuthEnabled()) {
    return true;
  }
  if (!userId) {
    return false;
  }
  return project.owner_id === userId;
}
