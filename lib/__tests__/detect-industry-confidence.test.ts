import { describe, it, expect } from "vitest";
import { detectIndustryWithConfidence } from "@/lib/app-spec/industry";

describe("detectIndustryWithConfidence", () => {
  it("metadata.category 应返回高置信度", () => {
    const result = detectIndustryWithConfidence({
      displayName: "记账本",
      appName: "ledger",
      metadata: { category: "finance" },
      screens: [],
    });
    expect(result.industry).toBe("finance");
    expect(result.source).toBe("metadata");
    expect(result.confidence).toBeGreaterThanOrEqual(0.9);
  });

  it("关键词命中应返回 keyword 来源", () => {
    const result = detectIndustryWithConfidence({
      displayName: "电商购物商城",
      appName: "shop",
      screens: [{ id: "home" }],
    });
    expect(result.industry).toBe("ecommerce");
    expect(result.source).toBe("keyword");
    expect(result.confidence).toBeGreaterThanOrEqual(0.7);
  });

  it("无信号应返回 generic", () => {
    const result = detectIndustryWithConfidence({
      displayName: "测试应用",
      appName: "test_app",
      screens: [{ id: "home" }],
    });
    expect(result.industry).toBe("generic");
    expect(result.source).toBe("generic");
    expect(result.confidence).toBe(0.5);
  });

  it("detectIndustry 向后兼容", async () => {
    const { detectIndustry } = await import("@/lib/app-spec/industry");
    const detailed = detectIndustryWithConfidence({
      displayName: "医院问诊",
      appName: "clinic",
      screens: [],
    });
    expect(detectIndustry({
      displayName: "医院问诊",
      appName: "clinic",
      screens: [],
    })).toBe(detailed.industry);
  });
});
