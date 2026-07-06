/**
 * Webhook API 限流（内存级，简单令牌桶）
 *
 * 注意：在 Vercel serverless 环境中，每个实例独立计数。
 * 需要跨实例限流时请使用 Supabase 持久化方案。
 */

const buckets = new Map<string, { tokens: number; lastRefill: number }>();
const RATE = 10;       // 每分钟 10 次
const REFILL_MS = 60000;

// ✅ 用 lazy-cleanup 替代 setInterval，避免 serverless 中定时器累积泄漏
// 每次 checkWebhookRateLimit 调用时顺便清理过期桶（摊销 O(n) 到每次请求）
let lastCleanup = Date.now();
const CLEANUP_INTERVAL_MS = REFILL_MS * 2;

function lazyCleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;
  const cutoff = now - REFILL_MS * 2;
  for (const [k, v] of buckets) {
    if (v.lastRefill < cutoff) buckets.delete(k);
  }
}

export function checkWebhookRateLimit(apiKey: string): { ok: boolean; remaining: number } {
  const now = Date.now();
  let bucket = buckets.get(apiKey);

  if (!bucket || now - bucket.lastRefill > REFILL_MS) {
    bucket = { tokens: RATE, lastRefill: now };
    buckets.set(apiKey, bucket);
  }

  if (bucket.tokens <= 0) return { ok: false, remaining: 0 };
  bucket.tokens--;

  // 摊销清理过期桶
  lazyCleanup();

  return { ok: true, remaining: bucket.tokens };
}
