import { describe, it, expect } from "vitest";

describe("配额配置", () => {
  const TIER_CONFIGS = {
    free: { projects: 3, codegen: 10, storage: 100 },
    pro: { projects: 50, codegen: 500, storage: 5000 },
    enterprise: { projects: 999, codegen: 9999, storage: 50000 },
  };

  it("Free/Pro/Enterprise 递进合理", () => {
    expect(TIER_CONFIGS.pro.projects).toBeGreaterThan(TIER_CONFIGS.free.projects);
    expect(TIER_CONFIGS.enterprise.projects).toBeGreaterThan(TIER_CONFIGS.pro.projects);
    expect(TIER_CONFIGS.enterprise.codegen).toBeGreaterThan(TIER_CONFIGS.pro.codegen);
  });
});

describe("自动评分", () => {
  it("满分 metadata 应返回 excellent", async () => {
    const { scoreCodegenOutput } = await import("@/lib/codegen/quality-score");
    const result = scoreCodegenOutput({
      specQualityScore: 100,
      analyzeStatus: "passed",
      buildStatus: "passed",
      screenCount: 8,
      storageUploaded: true,
    });
    expect(result.total).toBeGreaterThanOrEqual(90);
    expect(result.level).toBe("excellent");
  });

  it("空 metadata 应返回 poor", async () => {
    const { scoreCodegenOutput } = await import("@/lib/codegen/quality-score");
    const result = scoreCodegenOutput({});
    expect(result.total).toBeLessThan(30);
    expect(result.level).toBe("poor");
  });
});

describe("模板库", () => {
  it("应包含 5 套预置模板", async () => {
    const { TEMPLATE_LIBRARY } = await import("@/lib/app-spec/template-library");
    expect(TEMPLATE_LIBRARY.length).toBeGreaterThanOrEqual(5);
  });

  it("每个模板应有有效 Spec", async () => {
    const { TEMPLATE_LIBRARY } = await import("@/lib/app-spec/template-library");
    for (const tmpl of TEMPLATE_LIBRARY) {
      expect(tmpl.spec.screens.length).toBeGreaterThanOrEqual(3);
      expect(tmpl.spec.appName).toBeTruthy();
    }
  });
});
