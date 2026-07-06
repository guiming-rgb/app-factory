import { createHash, timingSafeEqual } from "crypto";

let cachedKeyMap: Map<string, string> | null = null;

/** @internal 测试用 — 重置 env 解析缓存 */
export function resetAnalyticsIngestKeyCache(): void {
  cachedKeyMap = null;
}

function parseIngestKeyMap(raw: string | undefined): Map<string, string> {
  const map = new Map<string, string>();
  const trimmed = raw?.trim();
  if (!trimmed) return map;

  if (trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmed) as Record<string, unknown>;
      for (const [appId, secret] of Object.entries(parsed)) {
        if (typeof secret === "string" && secret.trim()) {
          map.set(appId.trim(), secret.trim());
        }
      }
      return map;
    } catch {
      return map;
    }
  }

  for (const pair of trimmed.split(",")) {
    const [appId, secret] = pair.split(":").map((s) => s.trim());
    if (appId && secret) {
      map.set(appId, secret);
    }
  }
  return map;
}

function getIngestKeyMap(): Map<string, string> {
  if (!cachedKeyMap) {
    cachedKeyMap = parseIngestKeyMap(process.env.ANALYTICS_INGEST_KEYS);
  }
  return cachedKeyMap;
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/**
 * P2: 校验 x-analytics-key 并解析对应 app_id。
 * 生产环境必须配置 ANALYTICS_INGEST_KEYS（appId:secret 或 JSON）。
 */
export function resolveAnalyticsIngestAppId(apiKey: string): string | null {
  const trimmed = apiKey.trim();
  if (!trimmed) return null;

  for (const [appId, secret] of getIngestKeyMap()) {
    if (safeEqual(trimmed, secret)) {
      return appId;
    }
  }

  if (
    process.env.NODE_ENV === "development" &&
    process.env.ANALYTICS_INGEST_LEGACY !== "0"
  ) {
    if (/^[a-zA-Z0-9_-]{8,64}$/.test(trimmed)) {
      console.warn(
        "[analytics] 开发模式 legacy：x-analytics-key 即 app_id；生产请配置 ANALYTICS_INGEST_KEYS",
      );
      return trimmed;
    }
  }

  return null;
}

/** 开发/测试用：从 app_id 生成 ingest secret 的文档示例（非加密强度） */
export function deriveDevIngestSecret(appId: string): string {
  return createHash("sha256")
    .update(`analytics-ingest:${appId}`)
    .digest("hex")
    .slice(0, 32);
}
