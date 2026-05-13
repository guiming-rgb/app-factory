/**
 * Supabase 管理端客户端（Service Role）。
 * 仅允许在服务端使用（Route Handler、Server Action、Inngest 函数等），禁止导入到带 `"use client"` 的组件。
 *
 * 使用惰性初始化：避免在 import 阶段就 createClient（占位 URL 会抛 Invalid supabaseUrl），
 * 进而拖垮 /api/inngest 的 Inngest Dev 同步与其它路由的编译。
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (cached) {
    return cached;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!supabaseUrl) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
  }
  if (!serviceRoleKey) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
  }
  if (!/^https?:\/\//i.test(supabaseUrl)) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL 必须是完整地址（以 http:// 或 https:// 开头）。请打开 .env.local，把占位符换成 Supabase 控制台里的 Project URL。"
    );
  }

  try {
    cached = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(
      `Supabase 客户端初始化失败：${msg}。请确认 NEXT_PUBLIC_SUPABASE_URL 与 SUPABASE_SERVICE_ROLE_KEY 来自同一 Supabase 项目。`
    );
  }

  return cached;
}
