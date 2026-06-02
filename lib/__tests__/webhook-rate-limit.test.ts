import { describe, it, expect } from "vitest";

describe("Webhook 限流", () => {
  it("首次请求应通过", async () => {
    const { checkWebhookRateLimit } = await import("../auth/webhook-rate-limit");
    const result = checkWebhookRateLimit("test-key-" + Date.now());
    expect(result.ok).toBe(true);
    expect(result.remaining).toBeGreaterThanOrEqual(0);
  });

  it("耗尽配额应拒绝", async () => {
    const { checkWebhookRateLimit } = await import("../auth/webhook-rate-limit");
    const key = "exhaust-key-" + Date.now();
    for (let i = 0; i < 10; i++) checkWebhookRateLimit(key);
    const result = checkWebhookRateLimit(key);
    expect(result.ok).toBe(false);
    expect(result.remaining).toBe(0);
  });
});
