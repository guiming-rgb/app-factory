import { describe, it, expect } from "vitest";
import {
  generateSimpleHarmonyMethod,
} from "@/lib/harmony-codegen/harmony-method-generator";
import { emitHarmonyIndustryServicesEts } from "@/lib/harmony-codegen/emit-industry-services";

describe("harmony-method-generator (B3)", () => {
  it("GET 方法应生成 restFetch 调用", () => {
    const body = generateSimpleHarmonyMethod({
      name: "getBudgets",
      table: "budgets",
      verb: "GET",
    });
    expect(body).toContain("getBudgets:");
    expect(body).toContain('restFetch("budgets")');
  });

  it("finance harmonyMethods 应并入 IndustryServices", () => {
    const ets = emitHarmonyIndustryServicesEts("finance");
    expect(ets).toContain("getBudgets:");
    expect(ets).toContain("getAccounts:");
    expect(ets).toContain("getMonthlySummary:");
  });

  it("crm harmonyMethods 应生成 getPipeline 与 addActivity", () => {
    const ets = emitHarmonyIndustryServicesEts("crm");
    expect(ets).toContain("getPipeline:");
    expect(ets).toContain("addActivity:");
    expect(ets).toContain("getActivities:");
  });

  it("fitness harmonyMethods 应生成 getBodyStats 与 addBodyStat", () => {
    const ets = emitHarmonyIndustryServicesEts("fitness");
    expect(ets).toContain("getBodyStats:");
    expect(ets).toContain("addBodyStat:");
    expect(ets).toContain("getWorkoutLog:");
  });
});
