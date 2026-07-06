import { describe, expect, it } from "vitest";

import { getClientIp, rateLimitBucketKey } from "@/lib/auth/rate-limit";

describe("rate limit bucket key", () => {
  it("无 userId 时应按 IP 分桶", () => {
    const req = {
      headers: new Headers({ "x-forwarded-for": "203.0.113.1, 10.0.0.1" }),
    } as Parameters<typeof getClientIp>[0];

    expect(getClientIp(req)).toBe("203.0.113.1");
    expect(rateLimitBucketKey(req, null)).toBe("ip:203.0.113.1");
  });

  it("有 userId 时应优先 user 分桶", () => {
    const req = {
      headers: new Headers(),
    } as Parameters<typeof rateLimitBucketKey>[0];

    expect(rateLimitBucketKey(req, "user-abc")).toBe("user:user-abc");
  });
});
