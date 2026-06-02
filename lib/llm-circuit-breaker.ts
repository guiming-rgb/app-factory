/**
 * P0-2: LLM 调用熔断器
 * OpenAI API 连续失败 N 次 → 自动切换备用端点/模型/降级
 */

type CircuitState = "closed" | "open" | "half-open";

type FallbackConfig = {
  baseURL?: string;
  model?: string;
  apiKey?: string;
};

class LLMCircuitBreaker {
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime = 0;
  private state: CircuitState = "closed";
  private readonly maxFailures = 3;
  private readonly resetTimeoutMs = 30000;
  private readonly halfOpenMax = 2;

  getState(): CircuitState { return this.state; }
  getFailureCount(): number { return this.failureCount; }

  onSuccess(): void {
    this.failureCount = 0;
    if (this.state === "half-open") {
      this.successCount++;
      if (this.successCount >= this.halfOpenMax) {
        this.state = "closed";
        this.successCount = 0;
      }
    }
  }

  onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.maxFailures && this.state === "closed") {
      this.state = "open";
      console.warn("[LLM CircuitBreaker] OPEN — 连续 3 次失败，切换备用端点");
    }
  }

  tryReset(): boolean {
    if (this.state === "open" && Date.now() - this.lastFailureTime > this.resetTimeoutMs) {
      this.state = "half-open";
      this.successCount = 0;
      console.log("[LLM CircuitBreaker] HALF-OPEN — 尝试恢复");
      return true;
    }
    return false;
  }

  getFallbackConfig(): FallbackConfig | null {
    if (this.state !== "open") return null;

    const fallbacks: FallbackConfig[] = [];
    if (process.env.OPENAI_FALLBACK_BASE_URL?.trim()) fallbacks.push({ baseURL: process.env.OPENAI_FALLBACK_BASE_URL.trim() });
    if (process.env.OPENAI_FALLBACK_API_KEY?.trim()) fallbacks.push({ apiKey: process.env.OPENAI_FALLBACK_API_KEY.trim() });
    if (process.env.OPENAI_FALLBACK_MODEL?.trim()) fallbacks.push({ model: process.env.OPENAI_FALLBACK_MODEL.trim() });

    return fallbacks.length > 0 ? Object.assign({}, ...fallbacks) : null;
  }
}

/** 全局单例 */
export const llmBreaker = new LLMCircuitBreaker();
