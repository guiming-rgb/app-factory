/**
 * 轻量 Supabase 限流适配器 — 供 middleware 使用。
 * 与 lib/auth/rate-limit.ts 互补：那个是 per-user per-action 限流，这个是全局 API 限流。
 */
import { getSupabaseAdmin } from "@/lib/supabase";

const WINDOW_MS = 60000; // 1 分钟
const RATE_LIMIT = 120;  // 每分钟 120 次（生产水平）

export async function checkSupabaseRateLimit(): Promise<boolean> {
  const key = `api-global-${Math.floor(Date.now() / WINDOW_MS)}`;
  try {
    const supabase = getSupabaseAdmin();
    const { count, error } = await supabase
      .from("api_rate_limit_events")
      .select("*", { count: "exact", head: true })
      .eq("bucket_key", key)
      .eq("action", "api")
      .gte("created_at", new Date(Date.now() - WINDOW_MS).toISOString());

    if (error) {
      // 表未就绪时降级放行
      if (/relation.*does not exist|schema cache/i.test(error.message)) {
        return true;
      }
      console.warn("[rate-limit-middleware] query error, allowing:", error.message);
      return true;
    }

    if ((count ?? 0) >= RATE_LIMIT) return false;

    // fire-and-forget 插入（不阻塞请求）
    supabase.from("api_rate_limit_events").insert({ bucket_key: key, action: "api" }).then(
      () => {},
      (e) => { if (!/relation.*does not exist/i.test(e?.message ?? "")) console.warn("[rate-limit-middleware] insert error:", e?.message); }
    );
    return true;
  } catch {
    return true; // DB 不可用时降级放行
  }
}

/** 定期清理旧事件（可在 warmup 或 cron 中调用） */
export async function cleanupOldRateLimitEvents(): Promise<void> {
  try {
    const supabase = getSupabaseAdmin();
    const cutoff = new Date(Date.now() - 2 * WINDOW_MS).toISOString();
    await supabase.from("api_rate_limit_events").delete().lt("created_at", cutoff);
  } catch {
    // 静默忽略
  }
}
