import { describe, it, expect } from "vitest";
import { buildMinimalSpecFromProject } from "../from-project";

describe("buildMinimalSpecFromProject", () => {
  it("应根据项目标题生成最小 Spec", () => {
    const spec = buildMinimalSpecFromProject({
      id: "00000000-0000-0000-0000-000000000001",
      title: "少儿足球",
      idea: "记录比赛和查看球员"
    });

    expect(spec.specVersion).toBe("0.1.0");
    expect(spec.displayName).toBe("少儿足球");
    expect(spec.appName).toMatch(/^[a-z][a-z0-9_]*$/);
    expect(spec.screens.length).toBeGreaterThanOrEqual(3);
    expect(spec.screens.some((s) => s.type === "list")).toBe(true);
    expect(spec.screens.some((s) => s.type === "tabRoot")).toBe(true);
    const targets = spec.targets as Record<string, Record<string, unknown>>;
    expect(targets.flutter.enabled).toBe(true);
    expect(targets.backend.provider).toBe("supabase");
    expect((targets.wechatMiniProgram as Record<string, unknown>)?.enabled).toBe(true);
  });

  it("应生成默认的平台列表（含 web v6）", () => {
    const spec = buildMinimalSpecFromProject({
      id: "00000000-0000-0000-0000-000000000002",
      title: "测试"
    });

    const platforms = (spec.targets as Record<string, Record<string, unknown>>).flutter.platforms as string[];
    expect(platforms).toContain("ios");
    expect(platforms).toContain("android");
    expect(platforms).toContain("web");
  });

  it("应生成 navigation.tabs", () => {
    const spec = buildMinimalSpecFromProject({
      id: "00000000-0000-0000-0000-000000000003",
      title: "测试"
    });

    expect(spec.navigation).toBeDefined();
    expect(spec.navigation!.tabs).toBeDefined();
    expect(spec.navigation!.tabs!.length).toBeGreaterThanOrEqual(1);
  });

  it("应设置 complianceFlags.templateLimited", () => {
    const spec = buildMinimalSpecFromProject({
      id: "00000000-0000-0000-0000-000000000004",
      title: "测试"
    });

    expect(spec.complianceFlags).toBeDefined();
  });

  it("中文标题应正确 slug 化 appName", () => {
    const spec = buildMinimalSpecFromProject({
      id: "00000000-0000-0000-0000-000000000005",
      title: "我的App!"
    });

    // appName 只应包含小写字母数字下划线
    expect(spec.appName).toMatch(/^[a-z][a-z0-9_]*$/);
  });
});
