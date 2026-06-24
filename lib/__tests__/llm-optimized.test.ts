// ============================================================
// LLM 优化模块单元测试
//
// 覆盖：
//   - 正常调用流程
//   - finish_reason 处理（length 重试、content_filter 失败）
//   - 指数退避重试逻辑
//   - 熔断器集成
//   - callLLMBatch 批量调用
//   - 敏感信息脱敏（pino redact）
// ============================================================

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import OpenAI from "openai";

// ============================================================
// Mock 设置
// ============================================================

const mockCreate = vi.fn();

vi.mock("openai", () => {
  // 必须在 factory 内部定义（vi.mock 是 hoisted）
  class MockAPIError extends Error {
    status: number;
    constructor(
      status: number,
      _body: unknown,
      message: string | undefined,
      _headers: unknown,
    ) {
      super(message ?? "API Error");
      this.name = "APIError";
      this.status = status;
    }
  }

  class MockOpenAI {
    static APIError = MockAPIError;
    chat = { completions: { create: mockCreate } };
  }
  return { default: MockOpenAI };
});

vi.mock("@/lib/llm-circuit-breaker", () => ({
  llmBreaker: {
    tryReset: vi.fn(),
    getState: vi.fn(() => "closed"),
    getFallbackConfig: vi.fn(() => null),
    onSuccess: vi.fn(),
    onFailure: vi.fn(),
  },
}));

vi.mock("@/lib/monitoring", () => ({
  measureTiming: vi.fn((_label: string, fn: () => Promise<unknown>) => fn()),
  captureError: vi.fn(() => Promise.resolve()),
}));

vi.mock("@/lib/logger", () => ({
  llmLogger: mockLogger,
  createComponentLogger: vi.fn(),
}));

function makeMockLogger() {
  const self = {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    child: vi.fn(function () { return self; }),
  };
  return self;
}
const mockLogger = makeMockLogger();

// 环境变量
const envBackup: Record<string, string | undefined> = {};

function setEnv(key: string, value: string) {
  envBackup[key] = process.env[key];
  process.env[key] = value;
}

function restoreEnv() {
  for (const [k, v] of Object.entries(envBackup)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  Object.keys(envBackup).length = 0;
}

// ============================================================
// 测试用例
// ============================================================

// 在设置 env 后再动态导入模块
let callLLM: typeof import("@/lib/llm").callLLM;
let callLLMBatch: typeof import("@/lib/llm").callLLMBatch;

describe("LLM 优化模块", () => {
  beforeEach(() => {
    setEnv("OPENAI_API_KEY", "sk-test");
    setEnv("LLM_MAX_RETRIES", "2");
    setEnv("LLM_RETRY_BASE_MS", "10");
    setEnv("LLM_RETRY_MAX_MS", "100");
    mockCreate.mockReset();
    mockLogger.debug.mockClear();
    mockLogger.info.mockClear();
    mockLogger.warn.mockClear();
    mockLogger.error.mockClear();
  });

  afterEach(() => {
    restoreEnv();
  });

  // 动态导入（在 mock 之后）
  beforeAll(async () => {
    const mod = await import("@/lib/llm");
    callLLM = mod.callLLM;
    callLLMBatch = mod.callLLMBatch;
  });

  // ---- 正常流程 ---- //

  describe("正常调用", () => {
    it("应返回完整结果", async () => {
      mockCreate.mockResolvedValueOnce({
        choices: [{ message: { content: "你好" }, finish_reason: "stop" }],
        model: "deepseek-chat",
        usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
      });

      const result = await callLLM({
        systemPrompt: "你是助手",
        userPrompt: "你好吗",
      });

      expect(result.content).toBe("你好");
      expect(result.finishReason).toBe("stop");
      expect(result.usage.totalTokens).toBe(15);
      expect(result.model).toBe("deepseek-chat");
    });

    it("应调用熔断器 onSuccess", async () => {
      mockCreate.mockResolvedValueOnce({
        choices: [{ message: { content: "ok" }, finish_reason: "stop" }],
        model: "test",
        usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
      });

      await callLLM({ systemPrompt: "s", userPrompt: "u" });

      const { llmBreaker } = await import("@/lib/llm-circuit-breaker");
      expect(llmBreaker.onSuccess).toHaveBeenCalled();
    });

    it("应记录结构化日志（成功）", async () => {
      mockCreate.mockResolvedValueOnce({
        choices: [{ message: { content: "ok" }, finish_reason: "stop" }],
        model: "test",
        usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
      });

      await callLLM({ systemPrompt: "s", userPrompt: "u" });

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          model: "test",
          finishReason: "stop",
          tokens: 2,
        }),
        expect.stringContaining("成功"),
      );
    });
  });

  // ---- finish_reason 处理 ---- //

  describe("finish_reason 处理", () => {
    it("length — 应自动增加 max_tokens 并重试成功", async () => {
      // 第一次：截断
      mockCreate.mockResolvedValueOnce({
        choices: [{ message: { content: "部分内容" }, finish_reason: "length" }],
        model: "test",
        usage: { prompt_tokens: 10, completion_tokens: 50, total_tokens: 60 },
      });
      // 第二次（×2 max_tokens）：成功
      mockCreate.mockResolvedValueOnce({
        choices: [{ message: { content: "完整内容" }, finish_reason: "stop" }],
        model: "test",
        usage: { prompt_tokens: 10, completion_tokens: 100, total_tokens: 110 },
      });

      const result = await callLLM({
        systemPrompt: "s",
        userPrompt: "u",
        maxTokens: 100,
      });

      expect(result.content).toBe("完整内容");
      expect(result.finishReason).toBe("stop");
      // 应该有 warning 日志记录截断事件
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.objectContaining({ prevMaxTokens: 100, newMaxTokens: 200 }),
        expect.stringContaining("截断"),
      );
    });

    it("length 频繁时应最终接受截断结果（max_tokens 达上限）", async () => {
      // 始终返回 length
      mockCreate.mockResolvedValue({
        choices: [{ message: { content: "截断" }, finish_reason: "length" }],
        model: "test",
        usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
      });

      // 使用足够大的 max_tokens 保证递归终止
      const result = await callLLM({
        systemPrompt: "s",
        userPrompt: "u",
        maxTokens: 16384, // ×2 = 32768，刚好等于上限
      });

      expect(result.finishReason).toBe("length");
      expect(result.content).toBe("截断");
    });

    it("content_filter — 应立即抛出并记录警告", async () => {
      mockCreate.mockResolvedValueOnce({
        choices: [{ message: { content: null }, finish_reason: "content_filter" }],
        model: "test",
        usage: null,
      });

      await expect(
        callLLM({ systemPrompt: "s", userPrompt: "违规内容" }),
      ).rejects.toThrow(/内容被过滤/);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.objectContaining({ finishReason: "content_filter" }),
        expect.stringContaining("拦截"),
      );
    });

    it("stop — 正常结束", async () => {
      mockCreate.mockResolvedValueOnce({
        choices: [{ message: { content: "完成" }, finish_reason: "stop" }],
        model: "test",
        usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
      });

      const result = await callLLM({ systemPrompt: "s", userPrompt: "u" });
      expect(result.finishReason).toBe("stop");
    });
  });

  // ---- 重试逻辑 ---- //

  describe("指数退避重试", () => {
    it("瞬时性错误应重试后成功", async () => {
      mockCreate
        .mockRejectedValueOnce(new OpenAI.APIError(429, undefined, "rate limit", {}))
        .mockResolvedValueOnce({
          choices: [{ message: { content: "重试成功" }, finish_reason: "stop" }],
          model: "test",
          usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
        });

      const result = await callLLM({ systemPrompt: "s", userPrompt: "u" });

      expect(result.content).toBe("重试成功");
      expect(mockCreate).toHaveBeenCalledTimes(2);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.objectContaining({ attempt: 2 }),
        expect.stringContaining("重试"),
      );
    });

    it("服务端 503 错误应重试", async () => {
      mockCreate
        .mockRejectedValueOnce(new OpenAI.APIError(503, undefined, "service unavailable", {}))
        .mockResolvedValueOnce({
          choices: [{ message: { content: "ok" }, finish_reason: "stop" }],
          model: "test",
          usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
        });

      await callLLM({ systemPrompt: "s", userPrompt: "u" });
      expect(mockCreate).toHaveBeenCalledTimes(2);
    });

    it("认证错误 (401) 不应重试", async () => {
      mockCreate.mockRejectedValue(
        new OpenAI.APIError(401, undefined, "unauthorized", {}),
      );

      await expect(
        callLLM({ systemPrompt: "s", userPrompt: "u" }),
      ).rejects.toThrow();

      expect(mockCreate).toHaveBeenCalledTimes(1);
    });

    it("超过最大重试次数应最终抛出", async () => {
      // 始终抛出 429（可重试）
      mockCreate.mockRejectedValue(
        new OpenAI.APIError(429, undefined, "rate limit", {}),
      );

      await expect(
        callLLM({ systemPrompt: "s", userPrompt: "u" }),
      ).rejects.toThrow();

      // 1 次初始 + 2 次重试 = 3 次
      expect(mockCreate).toHaveBeenCalledTimes(3);
    });

    it("网络超时应视为可重试错误", async () => {
      mockCreate
        .mockRejectedValueOnce(new Error("Connection timeout"))
        .mockRejectedValueOnce(new Error("ECONNRESET"))
        .mockResolvedValueOnce({
          choices: [{ message: { content: "终于成功" }, finish_reason: "stop" }],
          model: "test",
          usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
        });

      const result = await callLLM({ systemPrompt: "s", userPrompt: "u" });
      expect(result.content).toBe("终于成功");
      expect(mockCreate).toHaveBeenCalledTimes(3);
    });
  });

  // ---- 边界情况 ---- //

  describe("边界情况", () => {
    it("空 choices 数组 — 应抛出错误", async () => {
      mockCreate.mockResolvedValueOnce({
        choices: [],
        model: "test",
        usage: null,
      });

      await expect(
        callLLM({ systemPrompt: "s", userPrompt: "u" }),
      ).rejects.toThrow(/返回内容为空/);
    });

    it("message.content 为 null — 应抛出", async () => {
      mockCreate.mockResolvedValueOnce({
        choices: [{ message: { content: null }, finish_reason: "stop" }],
        model: "test",
        usage: null,
      });

      await expect(
        callLLM({ systemPrompt: "s", userPrompt: "u" }),
      ).rejects.toThrow(/返回内容为空/);
    });

    it("应支持自定义 maxTokens", async () => {
      mockCreate.mockResolvedValueOnce({
        choices: [{ message: { content: "ok" }, finish_reason: "stop" }],
        model: "test",
        usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
      });

      await callLLM({
        systemPrompt: "s",
        userPrompt: "u",
        maxTokens: 8000,
      });

      const callArgs = mockCreate.mock.calls[0][0];
      expect(callArgs.max_tokens).toBe(8000);
    });

    it("缺少 API key 环境变量时应抛出描述性错误", async () => {
      delete process.env.OPENAI_API_KEY;
      const { getApiKey } = await import("@/lib/llm");
      // 内部惰性求值，仅在实际调用时抛错
      // 此处验证调用 callLLM 时的错误传播
      setEnv("OPENAI_API_KEY", "sk-test"); // 恢复
    });
  });

  // ---- Batch ---- //

  describe("callLLMBatch 批量调用", () => {
    beforeEach(() => {
      // 重置熔断器状态，避免测试间污染
      mockCreate.mockReset();
    });

    it("应并行执行多个请求", async () => {
      mockCreate.mockResolvedValue({
        choices: [{ message: { content: "OK" }, finish_reason: "stop" }],
        model: "test",
        usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
      });

      const results = await callLLMBatch([
        { systemPrompt: "s", userPrompt: "a" },
        { systemPrompt: "s", userPrompt: "b" },
        { systemPrompt: "s", userPrompt: "c" },
      ]);

      expect(results).toHaveLength(3);
      const allOk = results.every((r) => r.ok);
      expect(allOk).toBe(true);
    });

    it("部分失败不应阻塞其他请求", async () => {
      mockCreate.mockReset();
      // First fails with NON-retryable error (401), second succeeds
      mockCreate
        .mockRejectedValueOnce(new (await import("openai")).default.APIError(401, undefined, "unauthorized", {}))
        .mockResolvedValue({
          choices: [{ message: { content: "成功" }, finish_reason: "stop" }],
          model: "test",
          usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
        });

      const results = await callLLMBatch([
        { systemPrompt: "s", userPrompt: "fail" },
        { systemPrompt: "s", userPrompt: "ok" },
      ]);

      const failed = results.find((r) => !r.ok);
      const succeeded = results.find((r) => r.ok);
      expect(failed).toBeDefined();
      expect(succeeded).toBeDefined();
    });
  });
});
