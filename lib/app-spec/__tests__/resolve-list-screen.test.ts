import { describe, it, expect } from "vitest";
import { isListScreen, findFirstListScreen } from "../resolve-list-screen";
import type { AppSpec, AppSpecScreen } from "../types";

function makeSpec(screens: AppSpecScreen[]): AppSpec {
  return {
    specVersion: "0.1.0", appName: "test", displayName: "测试",
    screens,
    targets: { flutter: { enabled: true, platforms: ["ios"], formFactors: ["phone"] }, backend: { provider: "supabase" } },
    limitations: []
  };
}

describe("isListScreen", () => {
  it("type=list 应返回 true", () => {
    expect(isListScreen({ id: "items", title: "列表", type: "list" }, makeSpec([]))).toBe(true);
  });

  it("有 entity 绑定的非 list 类型应返回 true", () => {
    const spec = makeSpec([{ id: "main", title: "主页", type: "placeholder", entity: "product" }]);
    expect(isListScreen(spec.screens[0], spec)).toBe(true);
  });

  it("常见列表 ID 应返回 true", () => {
    const ids = ["match_list", "main_list", "todo_list", "task_list"];
    for (const id of ids) {
      const spec = makeSpec([{ id, title: "列表", type: "tabRoot" }]);
      expect(isListScreen(spec.screens[0], spec)).toBe(true);
    }
  });

  it("普通 placeholder 应返回 false", () => {
    expect(isListScreen({ id: "about", title: "关于", type: "placeholder" }, makeSpec([]))).toBe(false);
  });
});

describe("findFirstListScreen", () => {
  it("应优先返回 type=list 的 screen", () => {
    const spec = makeSpec([
      { id: "home", title: "首页", type: "tabRoot" },
      { id: "products", title: "商品", type: "list" },
      { id: "about", title: "关于", type: "placeholder" }
    ]);
    const found = findFirstListScreen(spec);
    expect(found).toBeDefined();
    expect(found!.id).toBe("products");
  });

  it("无 list 类型时应回退到有 entity 绑定的非 tabRoot 页面", () => {
    const spec = makeSpec([
      { id: "home", title: "首页", type: "tabRoot" },
      { id: "items", title: "项目", type: "placeholder", entity: "item" }
    ]);
    const found = findFirstListScreen(spec);
    expect(found).toBeDefined();
    expect(found!.id).toBe("items");
  });

  it("完全无列表时应返回 undefined", () => {
    const spec = makeSpec([
      { id: "home", title: "首页", type: "placeholder" }
    ]);
    expect(findFirstListScreen(spec)).toBeUndefined();
  });
});
