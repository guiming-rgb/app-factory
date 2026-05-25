"use client";

import { createBrowserClient } from "@supabase/ssr";

import { getSupabaseAnonKey, getSupabaseUrl, isAuthEnabled } from "@/lib/auth-config";

let client: ReturnType<typeof createBrowserClient> | null = null;

export function createSupabaseBrowserClient() {
  if (!isAuthEnabled()) {
    throw new Error("Auth 未启用：请配置 NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }
  if (!client) {
    client = createBrowserClient(getSupabaseUrl(), getSupabaseAnonKey());
  }
  return client;
}
