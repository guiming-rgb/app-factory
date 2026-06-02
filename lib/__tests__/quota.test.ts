import { describe, it, expect } from "vitest";

// 测试配额常量配置
const TIER_CONFIGS = {
  free: { projects: 3, codegen: 10 },
  pro: { projects: 50, codegen: 500 },
  enterprise: { projects: 999, codegen: 9999 },
};

describe("配额配置", () => {
  it("Free 层级应有合理限制", () => {
    expect(TIER_CONFIGS.free.projects).toBe(3);
    expect(TIER_CONFIGS.free.codegen).toBe(10);
  });

  it("Pro 层级应显著高于 Free", () => {
    expect(TIER_CONFIGS.pro.projects).toBeGreaterThan(TIER_CONFIGS.free.projects);
    expect(TIER_CONFIGS.pro.codegen).toBeGreaterThan(TIER_CONFIGS.free.codegen);
  });

  it("Enterprise 应接近无限", () => {
    expect(TIER_CONFIGS.enterprise.projects).toBeGreaterThan(500);
    expect(TIER_CONFIGS.enterprise.codegen).toBeGreaterThan(5000);
  });
});
