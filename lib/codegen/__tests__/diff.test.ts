import { describe, it, expect } from "vitest";
import { diffFiles, compareCodeOutputs } from "../diff";

describe("diffFiles", () => {
  it("相同时应全部 unchanged", () => {
    const r = diffFiles("a\nb\nc", "a\nb\nc");
    expect(r.every((l) => l.type === "unchanged")).toBe(true);
    expect(r).toHaveLength(3);
  });

  it("应检测新增行", () => {
    const r = diffFiles("a\nb", "a\nb\nc");
    expect(r.find((l) => l.content === "c")?.type).toBe("added");
  });

  it("应检测删除行", () => {
    const r = diffFiles("a\nb\nc", "a\nc");
    const removed = r.filter((l) => l.type === "removed");
    expect(removed.length).toBeGreaterThan(0);
  });

  it("应检测修改", () => {
    const r = diffFiles("old line", "new line");
    expect(r.some((l) => l.type === "removed" && l.content === "old line")).toBe(true);
    expect(r.some((l) => l.type === "added" && l.content === "new line")).toBe(true);
  });
});

describe("compareCodeOutputs", () => {
  it("应返回有差异的文件", () => {
    const old = new Map([["a.dart", "old"], ["b.dart", "same"]]);
    const current = new Map([["a.dart", "new"], ["b.dart", "same"]]);
    const diffs = compareCodeOutputs(old, current);
    expect(diffs).toHaveLength(1);
    expect(diffs[0].fileName).toBe("a.dart");
  });
});
