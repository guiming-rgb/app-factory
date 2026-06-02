import { describe, it, expect } from "vitest";
import { validateAppSpec } from "../validate";

describe("validateAppSpec", () => {
  const validMinimal = {
    specVersion: "0.1.0",
    appName: "test_app",
    displayName: "测试应用",
    targets: {
      flutter: { enabled: true, platforms: ["ios", "android"], formFactors: ["phone"] },
      backend: { provider: "supabase" }
    },
    screens: [
      { id: "main_list", title: "列表", type: "list" }
    ],
    limitations: ["模板限制"]
  };

  it("应通过有效的最小 Spec", () => {
    const result = validateAppSpec(validMinimal);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.spec.appName).toBe("test_app");
      expect(result.spec.displayName).toBe("测试应用");
    }
  });

  it("应拒绝缺失 specVersion", () => {
    const { specVersion, ...without } = validMinimal;
    const result = validateAppSpec(without);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.includes("specVersion"))).toBe(true);
    }
  });

  it("应拒绝缺失 appName", () => {
    const { appName, ...without } = validMinimal;
    const result = validateAppSpec(without);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.includes("appName"))).toBe(true);
    }
  });

  it("应拒绝缺失 screens", () => {
    const { screens, ...without } = validMinimal;
    const result = validateAppSpec(without);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.includes("screens"))).toBe(true);
    }
  });

  it("应拒绝空 screens", () => {
    const result = validateAppSpec({ ...validMinimal, screens: [] });
    expect(result.ok).toBe(false);
  });

  it("应拒绝缺失 targets", () => {
    const { targets, ...without } = validMinimal;
    const result = validateAppSpec(without);
    expect(result.ok).toBe(false);
  });

  it("应接受有效的 screen type（含 v6 新增类型）", () => {
    const types = ["tabRoot", "list", "detail", "form", "placeholder", "map", "chat", "call", "payment", "iot", "game", "ar", "medical", "automotive", "banking", "insurance", "kyc"];
    for (const t of types) {
      const spec = {
        ...validMinimal,
        screens: [{ id: "test_screen", title: "测试", type: t }]
      };
      const result = validateAppSpec(spec);
      expect(result.ok).toBe(true);
    }
  });

  it("应拒绝无效的 screen type", () => {
    const result = validateAppSpec({
      ...validMinimal,
      screens: [{ id: "bad", title: "坏", type: "invalid_type" }]
    });
    expect(result.ok).toBe(false);
  });

  it("应接受有效的 entity 定义", () => {
    const result = validateAppSpec({
      ...validMinimal,
      entities: [{
        name: "match",
        fields: [
          { name: "id", type: "uuid", primary: true },
          { name: "title", type: "string" },
          { name: "score", type: "int" }
        ]
      }]
    });
    expect(result.ok).toBe(true);
  });

  it("应拒绝缺失 name 的 entity", () => {
    const result = validateAppSpec({
      ...validMinimal,
      entities: [{ fields: [{ name: "x", type: "string" }] }]
    });
    expect(result.ok).toBe(false);
  });

  it("应拒绝缺失 fields 的 entity", () => {
    const result = validateAppSpec({
      ...validMinimal,
      entities: [{ name: "bad" }]
    });
    expect(result.ok).toBe(false);
  });

  it("应接受有效的 field type（含 v6 新增）", () => {
    const types = ["uuid", "string", "int", "float", "bool", "datetime", "json", "location", "image", "file"];
    for (const t of types) {
      const result = validateAppSpec({
        ...validMinimal,
        entities: [{ name: "test", fields: [{ name: "f", type: t }] }]
      });
      expect(result.ok).toBe(true);
    }
  });

  it("应拒绝无效的 field type", () => {
    const result = validateAppSpec({
      ...validMinimal,
      entities: [{ name: "bad", fields: [{ name: "f", type: "invalid" }] }]
    });
    expect(result.ok).toBe(false);
  });

  it("应接受 wechatMiniProgram 配置", () => {
    const result = validateAppSpec({
      ...validMinimal,
      targets: {
        ...validMinimal.targets,
        wechatMiniProgram: { enabled: true, tabBar: ["main_list"], loginMethod: "wechat" }
      }
    });
    expect(result.ok).toBe(true);
  });

  it("应接受有效的 navigation 配置", () => {
    const result = validateAppSpec({
      ...validMinimal,
      screens: [
        { id: "home", title: "首页", type: "tabRoot" },
        { id: "main_list", title: "列表", type: "list" },
        { id: "profile", title: "我的", type: "placeholder" }
      ],
      navigation: { tabs: ["main_list", "profile"] }
    });
    expect(result.ok).toBe(true);
  });

  it("应接受 appName 只能包含小写字母数字下划线", () => {
    const valid = ["test", "my_app", "app123", "a1_b2"];
    for (const name of valid) {
      const result = validateAppSpec({ ...validMinimal, appName: name });
      expect(result.ok).toBe(true);
    }
  });
});
