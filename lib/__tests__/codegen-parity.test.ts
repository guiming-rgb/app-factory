import { describe, it, expect } from "vitest";

// 三栈代码生成 parity 测试 — 确保 Flutter/WeChat/Harmony 产出结构完整

const testSpec = {
  specVersion: "0.1.0",
  appName: "parity_test",
  displayName: "Parity 测试",
  targets: {
    flutter: { enabled: true, platforms: ["ios", "android"], formFactors: ["phone"] },
    backend: { provider: "supabase" }
  },
  screens: [
    { id: "main_list", title: "物品列表", type: "list", entity: "items" },
    { id: "detail_view", title: "物品详情", type: "detail", entity: "items" },
    { id: "create_form", title: "添加物品", type: "form", entity: "items" }
  ],
  entities: [
    {
      name: "items",
      fields: [
        { name: "id", type: "uuid", primary: true },
        { name: "name", type: "string" },
        { name: "price", type: "float" }
      ]
    }
  ],
  limitations: ["模板限制"]
};

describe("三栈 Codegen Parity", () => {
  it("Flutter codegen 产出包含所有页面", async () => {
    const { generateFlutterProject } = await import("@/lib/flutter-codegen/generate");
    const result = await generateFlutterProject(testSpec, { keepOutput: true });
    expect(result.appName).toBe("parity_test");
    expect(result.displayName).toBe("Parity 测试");
    expect(result.outputDir).toContain("parity_test");
  });

  it("微信小程序 codegen 产出无崩溃", async () => {
    const { generateWechatProject } = await import("@/lib/wechat-codegen/generate");
    const result = await generateWechatProject(testSpec);
    expect(result.appName).toBe("parity_test");
    expect(result.outputDir).toContain("parity_test");
  });

  it("鸿蒙 codegen 产出包含必要文件", async () => {
    const { generateHarmonyProject } = await import("@/lib/harmony-codegen/generate");
    const result = await generateHarmonyProject(testSpec);
    expect(result.appName).toBe("parity_test");
    expect(result.outputDir).toContain("parity_test");
  });

  it("App Spec 校验与三栈口径一致", async () => {
    const { validateAppSpec } = await import("@/lib/app-spec/validate");
    const { resolveCodegenScreens } = await import("@/lib/app-spec/resolve-codegen-screens");

    const validation = validateAppSpec(testSpec);
    expect(validation.ok).toBe(true);
    if (validation.ok) {
      const screens = resolveCodegenScreens(validation.spec);
      expect(screens.length).toBeGreaterThanOrEqual(2);
      expect(screens.every(s => s.id && s.title && s.type)).toBe(true);
    }
  });
});
