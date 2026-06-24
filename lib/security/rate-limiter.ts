/**
 * 内存滑动窗口限流器
 *
 * 用于 API 路由的补充限流（与 lib/auth/rate-limit-supabase.ts 互补）：
 * - Supabase 限流器: 全局 API 限流，基于 DB 持久化，在 middleware 层级运行
 * - 本限流器: 内存级，按粒度（per-IP、per-user）细分，在 route handler 层级运行
 *
 * 特点:
 * - 滑动窗口：基于时间戳数组，精确到毫秒
 * - 无需外部存储：纯内存实现，适合单个 serverless 实例
 * - O(窗口内请求数) 空间复杂度
 *
 * 注意：在 Vercel serverless 环境中，每个冷启动实例独立计数。
 * 需要跨实例限流时，请使用 Supabase 持久化方案。
 */

// ── 类型 ──────────────────────────────────────────────

export interface RateLimitResult {
  /** 当前请求是否允许通过 */
  allowed: boolean;
  /** 窗口内剩余请求数 */
  remaining: number;
  /** 窗口重置时间戳 (ms) */
  resetTime: number;
}

export interface RateLimiterConfig {
  /** 时间窗口 (ms) */
  windowMs: number;
  /** 窗口内最大请求数 */
  maxRequests: number;
}

// ── RateLimiter 类 ────────────────────────────────────

export class RateLimiter {
  private windows: Map<string, number[]> = new Map();

  constructor(private config: RateLimiterConfig) {}

  /**
   * 检查指定 key 是否在限流窗口内
   *
   * @param key - 限流标识符（如 IP 地址、用户 ID）
   * @returns 包含 allowed、remaining 和 resetTime 的结果对象
   */
  check(key: string): RateLimitResult {
    const now = Date.now();
    const windowStart = now - this.config.windowMs;

    let timestamps = this.windows.get(key);

    // 清理过期时间戳
    if (timestamps) {
      // 移除窗口外的旧时间戳
      while (timestamps.length > 0 && timestamps[0] < windowStart) {
        timestamps.shift();
      }

      if (timestamps.length === 0) {
        this.windows.delete(key);
        timestamps = undefined;
      }
    }

    if (!timestamps) {
      // 首次请求
      timestamps = [now];
      this.windows.set(key, timestamps);

      return {
        allowed: true,
        remaining: this.config.maxRequests - 1,
        resetTime: now + this.config.windowMs,
      };
    }

    const used = timestamps.length;

    if (used >= this.config.maxRequests) {
      // 超出限制
      const oldestTimestamp = timestamps[0];
      const resetTime = oldestTimestamp + this.config.windowMs;

      return {
        allowed: false,
        remaining: 0,
        resetTime,
      };
    }

    // 记录当前请求
    timestamps.push(now);

    return {
      allowed: true,
      remaining: this.config.maxRequests - used - 1,
      resetTime: now + this.config.windowMs,
    };
  }

  /**
   * 重置指定 key 的限流状态
   */
  reset(key: string): void {
    this.windows.delete(key);
  }

  /**
   * 重置所有限流状态（慎用）
   */
  resetAll(): void {
    this.windows.clear();
  }

  /**
   * 获取当前活跃 key 数量（用于监控）
   */
  getActiveKeyCount(): number {
    this.cleanup();
    return this.windows.size;
  }

  /**
   * 清理所有过期的时间戳
   */
  cleanup(): void {
    const now = Date.now();
    const windowStart = now - this.config.windowMs;

    const entries = Array.from(this.windows.entries());
    for (const [key, timestamps] of entries) {
      while (timestamps.length > 0 && timestamps[0] < windowStart) {
        timestamps.shift();
      }
      if (timestamps.length === 0) {
        this.windows.delete(key);
      }
    }
  }
}

// ── 预配置单例 ────────────────────────────────────────

/**
 * Codegen 限流器: 每 IP 每分钟 5 次请求。
 * 适用于 /api/codegen 等高成本操作的限流。
 */
export const codegenRateLimiter = new RateLimiter({
  windowMs: 60_000, // 1 分钟
  maxRequests: 5,   // 每分钟 5 次
});

/**
 * 通用 API 限流器: 每 IP 每分钟 30 次请求。
 * 适用于常规 API 端点的补充限流。
 */
export const apiRateLimiter = new RateLimiter({
  windowMs: 60_000,
  maxRequests: 30,
});

/**
 * 创建自定义限流器的工厂函数
 */
export function createRateLimiter(
  windowMs: number,
  maxRequests: number
): RateLimiter {
  return new RateLimiter({ windowMs, maxRequests });
}
