/**
 * Webhook API 限流（内存级，简单令牌桶）
 */

const buckets = new Map<string, { tokens: number; lastRefill: number }>();
const RATE = 10;       // 每分钟 10 次
const REFILL_MS = 60000;

export function checkWebhookRateLimit(apiKey: string): { ok: boolean; remaining: number } {
  const now = Date.now();
  let bucket = buckets.get(apiKey);

  if (!bucket || now - bucket.lastRefill > REFILL_MS) {
    bucket = { tokens: RATE, lastRefill: now };
    buckets.set(apiKey, bucket);
  }

  if (bucket.tokens <= 0) return { ok: false, remaining: 0 };
  bucket.tokens--;
  return { ok: true, remaining: bucket.tokens };
}

// 定期清理过期桶
setInterval(() => {
  const cutoff = Date.now() - REFILL_MS * 2;
  for (const [k, v] of buckets) { if (v.lastRefill < cutoff) buckets.delete(k); }
}, REFILL_MS).unref();
