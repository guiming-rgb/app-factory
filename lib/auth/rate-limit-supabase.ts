/**
 * Supabase 持久化限流 — 供 middleware / analytics 等使用。
 * 与 lib/auth/rate-limit.ts 互补：那个是 per-user per-action 限流。
 */
import type { NextRequest } from "next/server";

import { getClientIp } from "@/lib/auth/rate-limit";
import { getSupabaseAdmin } from "@/lib/supabase";

const DEFAULT_WINDOW_MS = 60_000;
const DEFAULT_API_LIMIT = 120;

type BucketOptions = {
  limit?: number;
  windowMs?: number;
  action?: string;
};

export async function checkSupabaseRateLimitBucket(
  bucketKey: string,
  options: BucketOptions = {},
): Promise<boolean> {
  const windowMs = options.windowMs ?? DEFAULT_WINDOW_MS;
  const limit = options.limit ?? DEFAULT_API_LIMIT;
  const action = options.action ?? "api";
  const key = `${bucketKey}-${Math.floor(Date.now() / windowMs)}`;

  try {
    const supabase = getSupabaseAdmin();
    const { count, error } = await supabase
      .from("api_rate_limit_events")
      .select("*", { count: "exact", head: true })
      .eq("bucket_key", key)
      .eq("action", action)
      .gte("created_at", new Date(Date.now() - windowMs).toISOString());

    if (error) {
      if (/relation.*does not exist|schema cache/i.test(error.message)) {
        return true;
      }
      console.warn("[rate-limit-middleware] query error, allowing:", error.message);
      return true;
    }

    if ((count ?? 0) >= limit) return false;

    void supabase
      .from("api_rate_limit_events")
      .insert({ bucket_key: key, action })
      .then(
        () => {},
        (e) => {
          if (!/relation.*does not exist/i.test(e?.message ?? "")) {
            console.warn("[rate-limit-middleware] insert error:", e?.message);
          }
        },
      );
    return true;
  } catch {
    return true;
  }
}

/** P2-H6: middleware 全局 API 限流 — 按 IP 分桶，避免单用户拖垮全员 */
export async function checkSupabaseRateLimit(
  request: NextRequest,
): Promise<boolean> {
  const ip = getClientIp(request);
  return checkSupabaseRateLimitBucket(`ip:${ip}`, {
    limit: DEFAULT_API_LIMIT,
    windowMs: DEFAULT_WINDOW_MS,
    action: "api",
  });
}

/** 定期清理旧事件（可在 warmup 或 cron 中调用） */
export async function cleanupOldRateLimitEvents(): Promise<void> {
  try {
    const supabase = getSupabaseAdmin();
    const cutoff = new Date(Date.now() - 2 * DEFAULT_WINDOW_MS).toISOString();
    await supabase.from("api_rate_limit_events").delete().lt("created_at", cutoff);
  } catch {
    // 静默忽略
  }
}
