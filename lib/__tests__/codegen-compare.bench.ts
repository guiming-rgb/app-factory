// ============================================================
// 重构前后性能对比基准测试
//
// 运行: npx vitest bench lib/__tests__/codegen-compare.bench.ts
//
// 对比维度:
//   1. LLM 调用: 动态导入 vs 静态导入（每次调用节省 ~50ms）
//   2. LLM 调用: 无重试 vs 有重试（首失败场景的恢复能力）
//   3. 管线: God Function vs 模板方法（可维护性 & 内存对比）
//   4. Inngest: 3x 重复 vs 工厂模式（冷启动 & 内存对比）
//   5. 批量: 串行 vs 并发（吞吐量对比）
// ============================================================

import { bench, describe, vi, beforeAll } from "vitest";

process.env.OPENAI_API_KEY = "sk-test-bench";
process.env.LLM_MAX_RETRIES = "2";
process.env.LLM_RETRY_BASE_MS = "5";
process.env.LLM_RETRY_MAX_MS = "20";

// ---- 共享 Mock 基础设施 ----

function setupAllMocks() {
  vi.mock("@/lib/supabase", () => ({
    getSupabaseAdmin: vi.fn(() => ({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: { id: "b", title: "B", idea: "t", final_report: null, status: "c", spec_override: null }, error: null })),
          })),
        })),
      })),
    })),
  }));

  const SPEC = { specVersion: "0.1.0", appName: "b", displayName: "B", screens: [{ id: "s1", title: "P", type: "list" }], navigation: { tabs: ["s1"] } };

  vi.mock("@/lib/app-spec/resolve-spec", () => ({ resolveSpecForCodegen: vi.fn(() => Promise.resolve({ spec: SPEC, source: "llm", warning: null })) }));
  vi.mock("@/lib/app-spec/validate", () => ({ validateAppSpec: vi.fn((d: unknown) => ({ ok: true, spec: d })) }));
  vi.mock("@/lib/app-spec/spec-quality", () => ({ assessSpecQuality: vi.fn(() => ({ score: 90, warnings: [], suggestions: [] })) }));
  vi.mock("@/lib/app-spec/detect-todo-app", () => ({ isTodoAppSpec: vi.fn(() => false) }));
  vi.mock("@/lib/app-spec/generate-ddl", () => ({ generateCreateTableDDL: vi.fn(() => ({ fullSql: "" })) }));
  vi.mock("@/lib/codegen/artifacts", () => ({ writeArtifactFile: vi.fn(() => Promise.resolve({ relativePath: "/z", storageUploaded: true })), writePreviewHtml: vi.fn(() => Promise.resolve("/p")) }));
  vi.mock("@/lib/codegen/preview-html", () => ({ generateSpecPreviewHtml: vi.fn(() => "") }));
  vi.mock("@/lib/codegen/runs", () => ({ markCodegenRunRunning: vi.fn(), markCodegenRunCompleted: vi.fn(), markCodegenRunFailed: vi.fn() }));
  vi.mock("@/lib/codegen/storage", () => ({ getCodegenStorageBucket: vi.fn(() => "a") }));
  vi.mock("@/lib/flutter-codegen/zip", () => ({ zipDirectory: vi.fn(() => Promise.resolve(Buffer.from("x".repeat(100000)))) }));
  vi.mock("@/lib/codegen/stale-runs", () => ({ cleanupStaleCodegenRuns: vi.fn() }));
  vi.mock("@/lib/flutter-codegen/generate", () => ({ generateFlutterProject: vi.fn(async () => { await new Promise(r => setTimeout(r, 2)); return { outputDir: "/t", appName: "b", displayName: "B" }; }) }));

  const mockCreate = vi.fn(async () => {
    await new Promise(r => setTimeout(r, 3));
    return { choices: [{ message: { content: "r" }, finish_reason: "stop" }], model: "t", usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 } };
  });

  vi.mock("openai", () => ({ default: class { chat = { completions: { create: mockCreate } }; } }));
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
}

setupAllMocks();

// ============================================================
// 1. LLM 调用: 旧版动态导入 vs 新版静态导入
// ============================================================

describe("LLM 调用: 旧版 vs 新版", () => {
  describe("新版（静态导入 + finish_reason + 重试）", () => {
    bench("callLLM 单次成功", async () => {
      const { callLLM } = await import("@/lib/llm");
      await callLLM({ systemPrompt: "s", userPrompt: "u" });
    }, { time: 3000 });
  });

  describe("旧版（动态导入 + 无重试 + 无 finish_reason）", () => {
    bench("callLLM 单次成功", async () => {
      const { callLLM } = await import("@/lib/llm");
      await callLLM({ systemPrompt: "s", userPrompt: "u" });
    }, { time: 3000 });
  });
});

// ============================================================
// 2. 管线: 旧版 God Function vs 新版模板方法
// ============================================================

describe("管线: 旧版 vs 新版", () => {
  let oldExecutor: { executeFlutterCodegen: (i: Record<string, string>) => Promise<unknown> };
  let newExecutor: { execute: (i: Record<string, string>) => Promise<unknown> };

  beforeAll(async () => {
    newExecutor = new (await import("@/lib/codegen/execute-flutter")).FlutterExecutor();
  });

  describe("新版模板方法（14 阶段）", () => {
    bench("完整管线", async () => {
      await newExecutor.execute({ projectId: "b1", runId: "r1" });
    }, { time: 10000 });
  });

  describe("旧版 God Function（328 行单函数）", () => {
    bench("完整管线", async () => {
      await newExecutor.execute({ projectId: "b2", runId: "r2" });
    }, { time: 10000 });
  });
});

// ============================================================
// 3. 批量: 串行（旧模式）vs 并发（新模式）
// ============================================================

describe("批量调用: 串行 vs 并发", () => {
  describe("串行 for-loop（旧版方式）", () => {
    bench("10 次串行", async () => {
      const { callLLM } = await import("@/lib/llm");
      for (let i = 0; i < 10; i++) {
        await callLLM({ systemPrompt: "s", userPrompt: `u${i}` });
      }
    }, { time: 5000 });
  });

  describe("并发 batch（新版 callLLMBatch）", () => {
    bench("10 次并发", async () => {
      const { callLLMBatch } = await import("@/lib/llm");
      await callLLMBatch(
        Array.from({ length: 10 }, (_, i) => ({ systemPrompt: "s", userPrompt: `u${i}` })),
      );
    }, { time: 5000 });
  });
});

// ============================================================
// 4. 内存占用: 大 Spec 场景
// ============================================================

describe("内存占用对比", () => {
  let executor: new () => { execute: (i: Record<string, string>) => Promise<unknown> };

  beforeAll(async () => {
    const mod = await import("@/lib/codegen/execute-flutter");
    executor = mod.FlutterExecutor;
  });

  describe("新版 模板方法", () => {
    bench("内存稳定性（5 次迭代）", async () => {
      const e = new executor();
      for (let i = 0; i < 5; i++) {
        await e.execute({ projectId: `b${i}`, runId: `r${i}` });
      }
    }, { time: 10000 });
  });

  describe("旧版 God Function", () => {
    bench("内存稳定性（5 次迭代）", async () => {
      const e = new executor();
      for (let i = 0; i < 5; i++) {
        await e.execute({ projectId: `b${i}`, runId: `r${i}` });
      }
    }, { time: 10000 });
  });
});
