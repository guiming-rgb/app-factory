/**
 * 错误监控与性能追踪（Sentry 兼容 + 自建轻量方案）
 * P0: 生产环境错误追踪
 */

type ErrorContext = {
  component?: string;
  projectId?: string;
  agentCode?: string;
  target?: string;
  runId?: string;
  extra?: Record<string, unknown>;
};

/** 轻量错误追踪（Sentry 未配置时自动回退到 console + Supabase 日志） */
export async function captureError(error: unknown, context: ErrorContext = {}) {
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;

  // Sentry 已配置时自动上报
  if (typeof process !== "undefined" && process.env.SENTRY_DSN) {
    try {
      const Sentry = await import("@sentry/nextjs");
      Sentry.captureException(error, {
        tags: {
          component: context.component ?? "unknown",
          projectId: context.projectId,
          agentCode: context.agentCode,
          target: context.target,
        },
        extra: { ...context.extra, stack },
      });
      return;
    } catch {
      // Sentry 不可用时回退
    }
  }

  // 回退：写 Supabase 日志
  try {
    const { getSupabaseAdmin } = await import("@/lib/supabase");
    await getSupabaseAdmin().from("usage_logs").insert({
      event_type: "error",
      metadata: {
        message: message.slice(0, 1000),
        component: context.component,
        project_id: context.projectId,
        stack: stack?.slice(0, 2000),
        ...context.extra,
      },
    });
  } catch {
    // 静默
  }

  console.error(`[${context.component ?? "unknown"}]`, message);
}

/** API 路由错误包装器 */
export function withErrorTracking<T extends (...args: unknown[]) => unknown>(
  fn: T,
  component: string
): T {
  return (async (...args: unknown[]) => {
    try {
      return await fn(...args);
    } catch (error) {
      await captureError(error, { component });
      throw error;
    }
  }) as T;
}

/** 性能计时 */
export async function measureTiming<T>(
  label: string,
  fn: () => Promise<T>,
  context?: ErrorContext
): Promise<T> {
  const start = Date.now();
  try {
    return await fn();
  } finally {
    const duration = Date.now() - start;
    if (duration > 5000) {
      console.warn(`[perf] ${label} took ${duration}ms`, context);
      // 慢查询自动写入日志
      try {
        const { getSupabaseAdmin } = await import("@/lib/supabase");
        await getSupabaseAdmin().from("usage_logs").insert({
          event_type: "perf_slow",
          duration_ms: duration,
          metadata: { label, ...context },
        });
      } catch { /* 静默 */ }
    }
  }
}
