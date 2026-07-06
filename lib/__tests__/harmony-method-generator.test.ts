import { describe, it, expect } from "vitest";
import {
  generateSimpleHarmonyMethod,
  generateHarmonyMethodsFromConfig,
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
    const generated = generateHarmonyMethodsFromConfig([
      { name: "getBudgets", table: "budgets", verb: "GET" },
      { name: "getAccounts", table: "accounts", verb: "GET" },
    ]);
    const ets = emitHarmonyIndustryServicesEts("finance");
    expect(generated + ets).toContain("getBudgets:");
    expect(generated + ets).toContain("getAccounts:");
    expect(ets).toContain("getMonthlySummary:");
  });
});
