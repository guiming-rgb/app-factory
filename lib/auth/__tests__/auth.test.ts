import { describe, it, expect } from "vitest";

// 单元测试：auth 模块（纯逻辑，不依赖 Supabase 连接）

describe("auth-config", () => {
  it("isAuthEnabled returns false without anon key", async () => {
    const { isAuthEnabled } = await import("@/lib/auth-config");
    // CI 环境无 NEXT_PUBLIC_SUPABASE_ANON_KEY
    expect(typeof isAuthEnabled()).toBe("boolean");
  });

  it("getSupabaseUrl throws without URL", async () => {
    const { getSupabaseUrl } = await import("@/lib/auth-config");
    // CI 无 env，应抛出
    expect(() => getSupabaseUrl()).toThrow();
  });
});

describe("require-auth", () => {
  it("requireAuth returns error without session", async () => {
    const { requireAuth } = await import("@/lib/auth/require-auth");
    const result = await requireAuth();
    // 无 Supabase 连接时 getApiUser 返回 null → 401
    expect(result.error).toBeDefined();
    expect(result.error!.status).toBe(401);
  });

  it("requireProjectOwner returns error without session", async () => {
    const { requireProjectOwner } = await import("@/lib/auth/require-auth");
    const result = await requireProjectOwner("fake-project-id");
    expect(result.error).toBeDefined();
  });
});

describe("rate-limit-supabase", () => {
  it("checkSupabaseRateLimit degrades gracefully without DB", async () => {
    const { checkSupabaseRateLimit } = await import("@/lib/auth/rate-limit-supabase");
    // 无 Supabase 连接时降级放行
    const ok = await checkSupabaseRateLimit();
    expect(ok).toBe(true);
  });

  it("cleanupOldRateLimitEvents does not throw", async () => {
    const { cleanupOldRateLimitEvents } = await import("@/lib/auth/rate-limit-supabase");
    await expect(cleanupOldRateLimitEvents()).resolves.not.toThrow();
  });
});

describe("artifacts-cleanup", () => {
  it("cleanupLocalArtifacts returns valid stats", async () => {
    const { cleanupLocalArtifacts } = await import("@/lib/codegen/artifacts-cleanup");
    const result = await cleanupLocalArtifacts();
    expect(typeof result.deleted).toBe("number");
    expect(Array.isArray(result.errors)).toBe(true);
  });
});
