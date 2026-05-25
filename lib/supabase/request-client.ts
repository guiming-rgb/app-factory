import type { SupabaseClient } from "@supabase/supabase-js";

import { isAuthEnabled } from "@/lib/auth-config";
import { getSupabaseAdmin } from "@/lib/supabase";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * 用户触发的读/写：Auth 启用时用 session client（走 RLS）；
 * 未启用 Auth 时退回 Service Role（与 v4 前行为一致）。
 */
export async function getSupabaseForUserRequest(): Promise<SupabaseClient> {
  if (isAuthEnabled()) {
    const client = await createSupabaseServerClient();
    if (!client) {
      throw new Error("Auth 已启用但无法创建 session Supabase 客户端");
    }
    return client;
  }
  return getSupabaseAdmin();
}

/** 仅读路径：Auth 启用且无 session 时返回 null */
export async function getSupabaseForUserRead(): Promise<SupabaseClient | null> {
  if (!isAuthEnabled()) {
    return getSupabaseAdmin();
  }
  return createSupabaseServerClient();
}
