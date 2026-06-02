import { describe, it, expect } from "vitest";

describe("Sentry 监控配置", () => {
  it("measureTiming 应记录耗时", async () => {
    const { measureTiming } = await import("../monitoring");
    const start = Date.now();
    const result = await measureTiming("test", () => Promise.resolve(42));
    expect(result).toBe(42);
    expect(Date.now() - start).toBeLessThan(1000);
  });
});

describe("LLM 熔断器", () => {
  it("初始状态应为 closed", async () => {
    const { llmBreaker } = await import("../llm-circuit-breaker");
    expect(llmBreaker.getState()).toBe("closed");
  });

  it("应追踪失败计数", async () => {
    const { llmBreaker } = await import("../llm-circuit-breaker");
    const before = llmBreaker.getFailureCount();
    llmBreaker.onFailure();
    expect(llmBreaker.getFailureCount()).toBe(before + 1);
    llmBreaker.onSuccess(); // reset for other tests
  });
});

describe("预热模块", () => {
  it("warmup 应不抛错", async () => {
    const { warmup, isWarm } = await import("../warmup");
    await warmup();
    expect(isWarm()).toBe(true);
  });
});

describe("Feature Flags", () => {
  it("全量开启应返回 true", async () => {
    const { isFeatureEnabled } = await import("../feature-flags");
    expect(isFeatureEnabled("codegen_parallel")).toBe(true);
    expect(isFeatureEnabled("template_library")).toBe(true);
  });

  it("全量关闭应返回 false", async () => {
    const { isFeatureEnabled } = await import("../feature-flags");
    expect(isFeatureEnabled("stripe_billing")).toBe(false);
  });

  it("不存在的 flag 应返回 false", async () => {
    const { isFeatureEnabled } = await import("../feature-flags");
    expect(isFeatureEnabled("nonexistent")).toBe(false);
  });
});

describe("i18n 工厂 UI", () => {
  it("中文 t() 应返回中文", async () => {
    const { t, setLocale } = await import("../i18n");
    setLocale("zh");
    expect(t("home_title")).toContain("App 想法");
  });

  it("英文 t() 应返回英文", async () => {
    const { t, setLocale } = await import("../i18n");
    setLocale("en");
    expect(t("home_title")).toContain("App Idea");
  });

  it("不存在的 key 应返回 key 本身", async () => {
    const { t } = await import("../i18n");
    expect(t("nonexistent_key")).toBe("nonexistent_key");
  });
});
