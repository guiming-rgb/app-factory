import { afterEach, describe, expect, it, vi } from "vitest";

import {
  deriveDevIngestSecret,
  resetAnalyticsIngestKeyCache,
  resolveAnalyticsIngestAppId,
} from "@/lib/analytics/ingest-auth";

describe("analytics ingest auth", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    resetAnalyticsIngestKeyCache();
  });

  it("应通过 ANALYTICS_INGEST_KEYS 解析 app_id", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("ANALYTICS_INGEST_KEYS", "proj_a:secret_a,proj_b:secret_b");

    expect(resolveAnalyticsIngestAppId("secret_a")).toBe("proj_a");
    expect(resolveAnalyticsIngestAppId("wrong")).toBeNull();
  });

  it("应支持 JSON 格式的 ANALYTICS_INGEST_KEYS", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv(
      "ANALYTICS_INGEST_KEYS",
      JSON.stringify({ my_app: "ingest-key-xyz" }),
    );

    expect(resolveAnalyticsIngestAppId("ingest-key-xyz")).toBe("my_app");
  });

  it("deriveDevIngestSecret 应对同一 app_id 稳定", () => {
    expect(deriveDevIngestSecret("demo")).toBe(
      deriveDevIngestSecret("demo"),
    );
  });
});
