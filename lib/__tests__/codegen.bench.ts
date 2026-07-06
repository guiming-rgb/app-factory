// ============================================================
// 代码生成性能基准 — vitest bench 专用文件
// 运行: npx vitest bench
// ============================================================

import { bench, describe, vi, beforeAll } from "vitest";

process.env.OPENAI_API_KEY = "sk-test-benchmark";

// ---- Mock 设置（复用 benchmark test 的 mock 结构） ----

vi.mock("@/lib/supabase", () => ({
  getSupabaseAdmin: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() =>
            Promise.resolve({ data: { id: "bb", title: "B", idea: "t", final_report: null, status: "c", spec_override: null }, error: null }),
          ),
        })),
      })),
    })),
  })),
}));

const BENCH_SPEC = {
  specVersion: "0.1.0", appName: "bench", displayName: "B",
  screens: Array.from({ length: 20 }, (_, i) => ({ id: `s${i}`, title: `P${i}`, type: i === 0 ? "tabRoot" : "list", entity: `e${i % 5}` })),
  entities: Array.from({ length: 10 }, (_, i) => ({ name: `e${i}`, fields: Array.from({ length: 12 }, (_, j) => ({ name: `f${j}`, type: ["uuid","string","int","float","bool","datetime"][j%6], primary: j===0 })) })),
  navigation: { tabs: ["s0","s5","s10"] },
};

vi.mock("@/lib/app-spec/resolve-spec", () => ({ resolveSpecForCodegen: vi.fn(() => Promise.resolve({ spec: BENCH_SPEC, source: "llm", warning: null })) }));
vi.mock("@/lib/app-spec/validate", () => ({ validateAppSpec: vi.fn((d: unknown) => ({ ok: true, spec: d })) }));
vi.mock("@/lib/app-spec/spec-quality", () => ({ assessSpecQuality: vi.fn(() => ({ score: 90, warnings: [], suggestions: [] })) }));
vi.mock("@/lib/app-spec/detect-todo-app", () => ({ isTodoAppSpec: vi.fn(() => false) }));
vi.mock("@/lib/app-spec/generate-ddl", () => ({ generateCreateTableDDL: vi.fn(() => ({ fullSql: "" })) }));
vi.mock("@/lib/codegen/artifacts", () => ({ writeArtifactFile: vi.fn(() => Promise.resolve({ relativePath: "/z", storageUploaded: true })), writePreviewHtml: vi.fn(() => Promise.resolve("/p")) }));
vi.mock("@/lib/codegen/preview-html", () => ({ generateSpecPreviewHtml: vi.fn(() => "") }));
vi.mock("@/lib/codegen/runs", () => ({ markCodegenRunRunning: vi.fn(), markCodegenRunCompleted: vi.fn(), markCodegenRunFailed: vi.fn() }));
vi.mock("@/lib/codegen/storage", () => ({ getCodegenStorageBucket: vi.fn(() => "a") }));
vi.mock("@/lib/codegen/zip", () => ({ zipDirectory: vi.fn(() => Promise.resolve(Buffer.from("x".repeat(100000)))) }));
vi.mock("@/lib/codegen/stale-runs", () => ({ cleanupStaleCodegenRuns: vi.fn() }));
vi.mock("@/lib/flutter-codegen/generate", () => ({ generateFlutterProject: vi.fn(async () => { await new Promise(r => setTimeout(r, 2)); return { outputDir: "/t", appName: "b", displayName: "B" }; }) }));

const benchCreateMock = vi.fn(async () => {
  await new Promise(r => setTimeout(r, 5));
  return { choices: [{ message: { content: "r" }, finish_reason: "stop" }], model: "t", usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 } };
});

vi.mock("openai", () => ({ default: class { chat = { completions: { create: benchCreateMock } }; } }));
vi.mock("@/lib/llm-circuit-breaker", () => ({ llmBreaker: { tryReset: vi.fn(), getState: vi.fn(() => "closed"), getFallbackConfig: vi.fn(() => null), onSuccess: vi.fn(), onFailure: vi.fn() } }));
vi.mock("@/lib/monitoring", () => ({ measureTiming: vi.fn((_: string, fn: () => Promise<unknown>) => fn()), captureError: vi.fn() }));

const silent = { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn(), child: vi.fn(function(this: unknown) { return this; }) };
vi.mock("@/lib/logger", () => ({ llmLogger: silent, createComponentLogger: vi.fn() }));

vi.mock("@/lib/sandbox/docker-analyze", () => ({ runDockerFlutterAnalyze: vi.fn(() => ({ status: "passed" })), shouldFailCodegenOnAnalyze: vi.fn(() => false) }));
vi.mock("@/lib/flutter-codegen/attach-desktop-releases", () => ({ attachDesktopReleases: vi.fn(() => Promise.resolve(null)) }));
vi.mock("@/lib/flutter-codegen/desktop-build", () => ({ shouldAttemptDesktopBuild: vi.fn(() => false) }));
vi.mock("@/lib/flutter-codegen/build-web", () => ({ tryBuildFlutterWeb: vi.fn(() => ({ success: false })) }));
vi.mock("@/lib/github/desktop-gha-config", () => ({ preferDesktopGhaOverLocalBuild: vi.fn(() => true) }));
vi.mock("@/lib/notifications", () => ({ notifyCodegenComplete: vi.fn() }));
vi.mock("@/lib/notifications-channel", () => ({ notifyChannel: vi.fn() }));
vi.mock("@/lib/codegen/desktop-gha-orchestrator", () => ({ scheduleDesktopGhaAfterFlutter: vi.fn(() => Promise.resolve({ scheduled: false })) }));
vi.mock("@/lib/codegen/merge-run-metadata", () => ({ mergeCodegenRunNestedMetadata: vi.fn() }));
vi.mock("@/lib/codegen/upload-web-preview", () => ({ uploadFlutterWebPreview: vi.fn(() => Promise.resolve("/w")) }));
vi.mock("@/lib/codegen/auto-fix-flutter", () => ({ runAutoFixAnalyzeLoop: vi.fn(() => Promise.resolve({ analyze: { status: "passed" }, rounds: 0, log: [] })) }));
vi.mock("@/lib/app-spec/generate-backend-api", () => ({ generateBackendApi: vi.fn(() => ({ apiRoutes: "", supabaseTypes: "", envTemplate: "", packageJson: "{}", readme: "" })) }));
vi.mock("@/lib/app-spec/generate-edge-functions", () => ({ generateEdgeFunctions: vi.fn(() => []), generateEdgeFunctionIndex: vi.fn(() => "") }));

// ============================================================
// 基准测试
// ============================================================

describe("Codegen Pipeline Benchmarks", () => {
  let executor: { execute: (i: Record<string, string>) => Promise<unknown> };

  beforeAll(async () => {
    const { FlutterExecutor } = await import("@/lib/codegen/execute-flutter");
    executor = new FlutterExecutor();
  });

  bench("完整管线（20 screens / 10 entities）", async () => {
    await executor.execute({ projectId: "b1", runId: "r1" });
  }, { time: 10000 });

  describe("LLM 调用模式对比", () => {
    bench("串行 10 次", async () => {
      const { callLLM } = await import("@/lib/llm");
      for (let i = 0; i < 10; i++) {
        await callLLM({ systemPrompt: "s", userPrompt: `u${i}` });
      }
    }, { time: 5000 });

    bench("批量 10 并发", async () => {
      const { callLLMBatch } = await import("@/lib/llm");
      await callLLMBatch(
        Array.from({ length: 10 }, (_, i) => ({ systemPrompt: "s", userPrompt: `u${i}` })),
      );
    }, { time: 5000 });
  });
});
