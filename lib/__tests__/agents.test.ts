import { describe, it, expect } from "vitest";
import { detectAppCategory, filterAgentsForApp } from "../agents";

describe("detectAppCategory", () => {
  it("应检测游戏类", () => expect(detectAppCategory("做一个射击游戏")).toBe("game"));
  it("应检测社交类", () => expect(detectAppCategory("聊天交友社区")).toBe("social"));
  it("应检测工具类", () => expect(detectAppCategory("单位换算计算器")).toBe("tool"));
  it("应检测内容类", () => expect(detectAppCategory("新闻阅读博客")).toBe("content"));
  it("应检测数据类", () => expect(detectAppCategory("库存管理系统")).toBe("data"));
  it("默认兜底", () => expect(detectAppCategory("一个有用的App")).toBe("utility"));
});

describe("filterAgentsForApp", () => {
  it("游戏类应跳过商业顾问和测试负责人和项目经理", () => {
    const agents = filterAgentsForApp("做一个冒险游戏");
    const codes = agents.map((a) => a.code);
    expect(codes).not.toContain("business_advisor");
    expect(codes).not.toContain("qa_lead");
    expect(codes).not.toContain("project_manager");
    expect(codes).toContain("product_manager");
    expect(codes).toContain("architect");
  });

  it("工具类应跳过 CEO 和商业顾问", () => {
    const agents = filterAgentsForApp("一个计算器工具");
    const codes = agents.map((a) => a.code);
    expect(codes).not.toContain("ceo");
    expect(codes).not.toContain("business_advisor");
    expect(codes).toContain("product_manager");
  });

  it("数据类应保留所有 Agent", () => {
    const agents = filterAgentsForApp("库存管理系统");
    expect(agents.length).toBe(8);
  });
});
