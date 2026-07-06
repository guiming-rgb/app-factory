import { describe, expect, it } from "vitest";

import {
  validateAppSpecSemantics,
  type AppSpecValidationResult,
} from "@/lib/app-spec/validate";
import type { AppSpec } from "@/lib/app-spec/types";

const baseSpec: AppSpec = {
  specVersion: "0.1.0",
  appName: "demo_app",
  displayName: "Demo",
  screens: [
    { id: "home", title: "Home", type: "list" },
    { id: "detail", title: "Detail", type: "detail", children: ["home"] },
  ],
  navigation: { tabs: ["home"] },
};

describe("validateAppSpecSemantics", () => {
  it("合法 Spec 无语义错误", () => {
    expect(validateAppSpecSemantics(baseSpec)).toEqual([]);
  });

  it("应拒绝重复 screen.id", () => {
    const errors = validateAppSpecSemantics({
      ...baseSpec,
      screens: [
        { id: "home", title: "A", type: "list" },
        { id: "home", title: "B", type: "list" },
      ],
    });
    expect(errors.some((e) => e.includes("重复"))).toBe(true);
  });

  it("应拒绝 navigation.tabs 引用未知 screen", () => {
    const errors = validateAppSpecSemantics({
      ...baseSpec,
      navigation: { tabs: ["missing_tab"] },
    });
    expect(errors.some((e) => e.includes("navigation.tabs"))).toBe(true);
  });

  it("应拒绝无效 appName slug", () => {
    const errors = validateAppSpecSemantics({
      ...baseSpec,
      appName: "123bad",
    });
    expect(errors.some((e) => e.includes("appName"))).toBe(true);
  });
});

describe("validateAppSpec integration", () => {
  it("schema + 语义联合校验", async () => {
    const { validateAppSpec } = await import("@/lib/app-spec/validate");
    const validSpec = {
      specVersion: "0.1.0",
      appName: "parity_test",
      displayName: "Parity 测试",
      limitations: ["模板限制"],
      targets: {
        flutter: { enabled: true, platforms: ["ios"], formFactors: ["phone"] },
        backend: { provider: "supabase" },
      },
      screens: [
        { id: "main_list", title: "列表", type: "list", entity: "items" },
      ],
      entities: [
        { name: "items", fields: [{ name: "title", type: "string" }] },
      ],
    };
    const result = validateAppSpec(validSpec) as AppSpecValidationResult;
    expect(result.ok).toBe(true);
  });
});
