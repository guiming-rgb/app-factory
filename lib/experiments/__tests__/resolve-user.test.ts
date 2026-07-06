import { describe, expect, it, vi, beforeEach } from "vitest";
import { resolveExperimentUserId } from "@/lib/experiments/resolve-user";

vi.mock("@/lib/auth-config", () => ({
  isAuthEnabled: vi.fn(() => true),
}));

import { isAuthEnabled } from "@/lib/auth-config";

describe("resolveExperimentUserId", () => {
  beforeEach(() => {
    vi.mocked(isAuthEnabled).mockReturnValue(true);
  });

  it("auth 开启时绑定 session user_id", () => {
    const result = resolveExperimentUserId("user-1", undefined);
    expect(result).toEqual({ ok: true, userId: "user-1" });
  });

  it("auth 开启时拒绝伪造 user_id", () => {
    const result = resolveExperimentUserId("user-1", "user-2");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(403);
    }
  });

  it("auth 开启时未登录返回 401", () => {
    const result = resolveExperimentUserId(undefined, "user-1");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(401);
    }
  });

  it("auth 关闭时允许 body user_id", () => {
    vi.mocked(isAuthEnabled).mockReturnValue(false);
    const result = resolveExperimentUserId(undefined, "tool-user");
    expect(result).toEqual({ ok: true, userId: "tool-user" });
  });
});
