// ============================================================
// LLM 调用模块 — 优化版
//
// 改进点：
//   1. finish_reason 检查：length → 自动增加 max_tokens 重试，
//      content_filter → 立即失败，不返回被过滤内容
//   2. 静态导入：llmBreaker、measureTiming、captureError 在顶部导入
//   3. 指数退避重试：最大 2 次重试，base 500ms，×2 递增
//   4. 结构化日志：pino 替代 console.log/warn/error
// ============================================================

import OpenAI from "openai";
import { llmBreaker } from "@/lib/llm-circuit-breaker";
import { measureTiming } from "@/lib/monitoring";
import { captureError } from "@/lib/monitoring";
import { llmLogger, type LogContext } from "@/lib/logger";

// ============================================================
// 环境配置 — 惰性求值避免顶层 throw
// ============================================================

function getApiKey(): string {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("Missing OPENAI_API_KEY");
  return key;
}

function getBaseURL(): string {
  return process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
}

function getModel(): string {
  return process.env.OPENAI_MODEL || "gpt-4o-mini";
}

function getMaxTokens(): number {
  const v = Number(process.env.OPENAI_MAX_TOKENS);
  return Number.isFinite(v) && v > 0 ? v : 4096;
}

function getRetryConfig() {
  return {
    maxRetries: Number(process.env.LLM_MAX_RETRIES ?? "2"),
    baseDelayMs: Number(process.env.LLM_RETRY_BASE_MS ?? "500"),
    maxDelayMs: Number(process.env.LLM_RETRY_MAX_MS ?? "10000"),
  };
}

// ============================================================
// 惰性初始化 — OpenAI 客户端
// ============================================================

const LLM_TIMEOUT_MS = 120_000;

let _defaultClient: OpenAI | null = null;

function getDefaultClient(): OpenAI {
  if (!_defaultClient) {
    _defaultClient = new OpenAI({
      apiKey: getApiKey(),
      baseURL: getBaseURL(),
      timeout: LLM_TIMEOUT_MS,
      maxRetries: 1,
    });
  }
  return _defaultClient;
}

// ============================================================
// 类型定义
// ============================================================

export type LlmUsage = {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
};

export type LlmCallResult = {
  content: string;
  model: string;
  usage: LlmUsage;
  finishReason: string;
};

export interface LlmCallParams {
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
  /** 覆盖默认 max_tokens，用于"length"截断后的重试 */
  maxTokens?: number;
  /** 请求级日志上下文 */
  logContext?: LogContext;
  /** 外部取消信号（workflow 超时等） */
  signal?: AbortSignal;
}

// ============================================================
// 指数退避重试包装器
// ============================================================

interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
}

/**
 * 判断错误是否可重试
 * - 瞬时性网络错误、限流 (429)、服务端错误 (5xx)
 * - finish_reason "length"（截断 — 增加 max_tokens 后重试）
 * - 不可重试：content_filter、认证错误 (401/403)、参数错误 (400)
 */
function isRetryableError(err: unknown): boolean {
  if (err instanceof OpenAI.APIError) {
    // 限流
    if (err.status === 429) return true;
    // 服务端瞬时错误
    if (err.status >= 500 && err.status < 600) return true;
    // 认证 / 权限 / 参数错误 — 不可重试
    if (err.status === 401 || err.status === 403 || err.status === 400)
      return false;
  }
  // 网络层错误
  const msg = err instanceof Error ? err.message : String(err);
  const lower = msg.toLowerCase();
  return (
    lower.includes("timeout") ||
    lower.includes("econnrefused") ||
    lower.includes("econnreset") ||
    lower.includes("socket") ||
    lower.includes("network") ||
    lower.includes("abort") ||
    lower.includes("fetch") ||
    lower.includes("connection")
  );
}

/**
 * 指数退避延迟计算
 */
function calcDelay(retryCount: number, config: RetryConfig): number {
  return Math.min(config.baseDelayMs * Math.pow(2, retryCount), config.maxDelayMs);
}

// ============================================================
// 熔断器感知的客户端解析
// ============================================================

function resolveClient(): {
  client: OpenAI;
  effectiveModel: string;
  effectiveBaseURL: string;
  usingFallback: boolean;
} {
  llmBreaker.tryReset();

  const apiKey = getApiKey();
  const baseURL = getBaseURL();
  const model = getModel();

  const fallback = llmBreaker.getFallbackConfig();
  const effectiveBaseURL = fallback?.baseURL ?? baseURL;
  const effectiveModel = fallback?.model ?? model;
  const effectiveKey = fallback?.apiKey ?? apiKey;
  const usingFallback =
    effectiveBaseURL !== baseURL || effectiveKey !== apiKey;

  const client =
    usingFallback
      ? new OpenAI({
          apiKey: effectiveKey,
          baseURL: effectiveBaseURL,
          timeout: LLM_TIMEOUT_MS,
          maxRetries: 1,
        })
      : getDefaultClient();

  return { client, effectiveModel, effectiveBaseURL, usingFallback };
}

// ============================================================
// 核心调用函数
// ============================================================

export async function callLLM(
  params: LlmCallParams,
): Promise<LlmCallResult> {
  const retryConfig = getRetryConfig();
  const log = params.logContext
    ? llmLogger.child(params.logContext)
    : llmLogger;
  const maxTokens = params.maxTokens ?? getMaxTokens();

  let lastError: unknown;

  for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
    // 熔断器感知的客户端
    const { client, effectiveModel, effectiveBaseURL, usingFallback } =
      resolveClient();

    if (attempt > 0) {
      const delay = calcDelay(attempt - 1, retryConfig);
      log.warn(
        { attempt: attempt + 1, retryAfterMs: delay, model: effectiveModel },
        "LLM 调用重试",
      );
      await new Promise((r) => setTimeout(r, delay));
    }

    try {
      log.debug(
        {
          model: effectiveModel,
          temperature: params.temperature ?? 0.4,
          maxTokens,
          usingFallback,
          attempt: attempt + 1,
        },
        "LLM 请求开始",
      );

      // 核心调用 — 带性能计时
      if (params.signal?.aborted) {
        throw new Error("LLM 请求已取消");
      }

      const completion = await measureTiming("llm.call", () =>
        client.chat.completions.create(
          {
            model: effectiveModel,
            temperature: params.temperature ?? 0.4,
            max_tokens: maxTokens,
            messages: [
              { role: "system", content: params.systemPrompt },
              { role: "user", content: params.userPrompt },
            ],
          },
          params.signal ? { signal: params.signal } : undefined,
        ),
      );

      const choice = completion.choices[0];
      const finishReason = choice?.finish_reason ?? "unknown";
      const content = choice?.message?.content;

      // ---- finish_reason 处理 ---- //

      // content_filter：内容被过滤，立即失败不重试
      if (finishReason === "content_filter") {
        const err = new Error(`LLM 内容被过滤（content_filter）`);
        log.warn(
          { model: effectiveModel, finishReason },
          "内容被 content_filter 拦截",
        );
        captureError(err, {
          component: "callLLM",
          extra: {
            model: effectiveModel,
            finishReason,
            promptPreview: params.userPrompt.slice(0, 200),
          },
        }).catch(() => {});
        throw err;
      }

      // length：输出被截断 — 自动增加 max_tokens 重试
      if (finishReason === "length") {
        const newMaxTokens = maxTokens * 2;
        log.warn(
          {
            model: effectiveModel,
            prevMaxTokens: maxTokens,
            newMaxTokens,
          },
          "LLM 输出被截断（length），增加 max_tokens 重试",
        );

        if (newMaxTokens <= 32768) {
          // 递归调用，使用更大的 max_tokens（不占用重试次数）
          // 直接制造新的参数对象
          const expandedParams: LlmCallParams = {
            ...params,
            maxTokens: newMaxTokens,
            logContext: params.logContext,
          };
          return callLLM(expandedParams);
        }

        // max_tokens 已达上限，接受截断结果
        log.warn(
          { maxTokens: 32768 },
          "max_tokens 已达上限，接受截断输出",
        );
      }

      // 空内容检查
      if (!content) {
        throw new Error("LLM 返回内容为空");
      }

      // ---- 成功返回 ---- //
      llmBreaker.onSuccess();

      const usage = completion.usage;
      const result: LlmCallResult = {
        content,
        model: completion.model ?? effectiveModel,
        finishReason,
        usage: {
          promptTokens: usage?.prompt_tokens ?? 0,
          completionTokens: usage?.completion_tokens ?? 0,
          totalTokens: usage?.total_tokens ?? 0,
        },
      };

      log.info(
        {
          model: result.model,
          finishReason,
          tokens: result.usage.totalTokens,
          durationLabel: "llm.call.success",
          attempt: attempt + 1,
        },
        "LLM 调用成功",
      );

      return result;
    } catch (err: unknown) {
      lastError = err;

      // 熔断器记录失败
      llmBreaker.onFailure();

      const isRetryable = isRetryableError(err);

      log.error(
        {
          err:
            err instanceof Error
              ? { message: err.message, name: err.name }
              : String(err),
          model: effectiveModel,
          attempt: attempt + 1,
          retryable: isRetryable,
        },
        "LLM 调用失败",
      );

      // 不可重试 → 立即抛出
      if (!isRetryable) {
        captureError(err, {
          component: "callLLM",
          extra: {
            model: effectiveModel,
            baseURL: effectiveBaseURL,
            attempt: attempt + 1,
          },
        }).catch(() => {});
        throw err;
      }

      // 最后一次尝试 → 上报并抛出
      if (attempt >= retryConfig.maxRetries) {
        captureError(err, {
          component: "callLLM",
          extra: {
            model: effectiveModel,
            baseURL: effectiveBaseURL,
            totalAttempts: attempt + 1,
            retryConfig,
          },
        }).catch(() => {});
        throw err;
      }

      // 否则继续重试
    }
  }

  // 理论上不会到达（最后一次尝试后 throw）
  throw lastError;
}

// ============================================================
// 便捷方法
// ============================================================

/**
 * 单轮对话 — 无 system prompt
 */
export async function callLLMSimple(
  userPrompt: string,
  temperature = 0.4,
): Promise<string> {
  const result = await callLLM({
    systemPrompt: "You are a helpful assistant.",
    userPrompt,
    temperature,
  });
  return result.content;
}

/**
 * 批量并行调用（使用 Promise.allSettled，部分失败不阻塞）
 */
export async function callLLMBatch(
  requests: LlmCallParams[],
): Promise<
  Array<
    | { ok: true; result: LlmCallResult }
    | { ok: false; error: string; index: number }
  >
> {
  const results = await Promise.allSettled(
    requests.map((params, i) =>
      callLLM(params).then((r) => ({ ok: true as const, result: r, index: i })),
    ),
  );

  return results.map((r, i) =>
    r.status === "fulfilled"
      ? r.value
      : {
          ok: false as const,
          error: r.reason instanceof Error ? r.reason.message : String(r.reason),
          index: i,
        },
  );
}

// 保持向后兼容的 openai 导出
export { getDefaultClient as getOpenAIClient };
