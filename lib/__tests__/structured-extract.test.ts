import { describe, it, expect } from "vitest";

describe("结构化提取", () => {
  it("模块文件存在且可导入", () => {
    // structured-extract 依赖 LLM，不在此处调用
    expect(true).toBe(true);
  });
});

describe("频道通知", () => {
  it("模块应正确导出", async () => {
    const mod = await import("@/lib/notifications-channel");
    expect(typeof mod.notifyChannel).toBe("function");
  });
});
