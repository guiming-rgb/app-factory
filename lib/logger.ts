// ============================================================
// 结构化日志 — pino 封装
//
// 统一日志接口，支持：
//   - JSON 结构化输出（生产环境）
//   - 人类可读输出（开发环境）
//   - 自动注入 component / runId / projectId 等上下文字段
//   - 组件级子 logger（child()）
// ============================================================

import pino, { type Logger } from "pino";

const isDev = process.env.NODE_ENV === "development";
const isTest = process.env.NODE_ENV === "test";

export const rootLogger: Logger = pino({
  level: process.env.LOG_LEVEL ?? (isDev ? "debug" : "info"),
  ...(isTest
    ? { enabled: false }
    : isDev
      ? {
          transport: {
            target: "pino-pretty",
            options: { colorize: true, translateTime: "HH:MM:ss Z" },
          },
        }
      : {}),
  redact: {
    paths: [
      "apiKey",
      "effectiveKey",
      "token",
      "password",
      "secret",
      "authorization",
      "x-api-key",
      "messages[*].content",
    ],
    censor: "***REDACTED***",
  },
  formatters: {
    level(label) {
      return { level: label };
    },
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

// ============================================================
// 组件级 Logger 工厂
// ============================================================

export interface LogContext {
  component?: string;
  projectId?: string;
  runId?: string;
  model?: string;
  [key: string]: unknown;
}

export function createComponentLogger(
  component: string,
  baseContext?: LogContext,
): Logger {
  return rootLogger.child({ component, ...baseContext });
}

// ============================================================
// LLM 组件专用 Logger
// ============================================================

export const llmLogger = createComponentLogger("llm");
