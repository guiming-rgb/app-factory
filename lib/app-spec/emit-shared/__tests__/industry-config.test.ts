import { describe, it, expect } from "vitest";
import {
  P2_PILOT_INDUSTRIES,
  isPilotIndustry,
  getIndustryEmitConfig,
  buildWidgetContext,
  listConfiguredIndustryIds,
} from "@/lib/app-spec/emit-shared";

describe("emit-shared Mustache 行业配置 (B1)", () => {
  it("Mustache 行业列表应为 19 个", () => {
    expect(P2_PILOT_INDUSTRIES.length).toBe(19);
    expect(listConfiguredIndustryIds().length).toBe(19);
  });

  for (const id of P2_PILOT_INDUSTRIES) {
    it(`${id} JSON 配置应加载且 pilot=true`, () => {
      expect(isPilotIndustry(id)).toBe(true);
      const cfg = getIndustryEmitConfig(id);
      expect(cfg?.pilot).toBe(true);
      expect(cfg?.serviceName).toMatch(/Service$/);
      expect(cfg?.serviceMethods?.length).toBeGreaterThan(0);
    });
  }

  for (const id of ["finance", "ecommerce", "medical"] as const) {
    it(`${id} widgetClasses 非空`, () => {
      const cfg = getIndustryEmitConfig(id);
      expect(cfg?.widgetClasses?.length).toBeGreaterThan(0);
    });
  }

  it("buildWidgetContext 应合并 Spec 与配置", () => {
    const ctx = buildWidgetContext("finance", {
      specVersion: "0.1.0",
      appName: "ledger",
      displayName: "我的记账本",
      screens: [],
      navigation: { tabs: [] },
      entities: [{ name: "transactions", fields: [{ name: "title", type: "string", primary: false }] }],
    });
    expect(ctx.displayName).toBe("我的记账本");
    expect(ctx.tableName).toBe("transactions");
    expect(ctx.primaryColor).toContain("Color(");
  });
});
