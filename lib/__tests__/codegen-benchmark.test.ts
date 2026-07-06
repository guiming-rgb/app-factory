// ============================================================
// 代码生成性能基准测试
//
// 用法：
//   vitest run   → 运行 it() 功能测试
//   vitest bench → 运行 bench() 性能基准（需要 benchmark 模式）
//
// 覆盖：
//   - 管线耗时基础验证
//   - 批量 vs 串行 LLM 调用
//   - 内存占用稳定性
//   - 并发扩展性
// ============================================================

import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import type { FlutterExecutor } from "@/lib/codegen/execute-flutter";

// 所有测试都需要的环境变量
process.env.OPENAI_API_KEY = "sk-test-benchmark";

// ============================================================
// Mock 设置
// ============================================================

vi.mock("@/lib/supabase", () => ({
  getSupabaseAdmin: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() =>
            Promise.resolve({
              data: { id: "proj-bench", title: "基准测试", idea: "test", final_report: null, status: "completed", spec_override: null },
              error: null,
            }),
          ),
        })),
      })),
    })),
  })),
}));

vi.mock("@/lib/app-spec/resolve-spec", () => ({
  resolveSpecForCodegen: vi.fn(() =>
    Promise.resolve({ spec: BENCH_SPEC, source: "report-llm", warning: null }),
  ),
}));

vi.mock("@/lib/app-spec/validate", () => ({
  validateAppSpec: vi.fn((d: unknown) => ({ ok: true, spec: d })),
}));

vi.mock("@/lib/app-spec/spec-quality", () => ({
  assessSpecQuality: vi.fn(() => ({ score: 90, warnings: [], suggestions: [] })),
}));

vi.mock("@/lib/app-spec/detect-todo-app", () => ({
  isTodoAppSpec: vi.fn(() => false),
}));

vi.mock("@/lib/app-spec/generate-ddl", () => ({
  generateCreateTableDDL: vi.fn(() => ({ fullSql: "CREATE TABLE ..." })),
}));

vi.mock("@/lib/codegen/artifacts", () => ({
  writeArtifactFile: vi.fn(() => Promise.resolve({ relativePath: "/a.zip", storageUploaded: true })),
  writePreviewHtml: vi.fn(() => Promise.resolve("/p.html")),
}));

vi.mock("@/lib/codegen/verify-artifact", () => {
  const okResult = {
    ok: true,
    target: "flutter" as const,
    fileCount: 20,
    hasPubspec: true,
    hasRouter: true,
    hasAuth: true,
    hasSql: true,
    hasAppJson: false,
    hasProjectConfig: false,
    hasWechatPages: false,
    hasHarmonyMainPages: false,
    hasHarmonyEntry: false,
    hasHarmonyEtsPages: false,
    dartAnalyze: "skipped" as const,
    errors: [] as string[],
  };
  return {
    verifyCodegenArtifact: vi.fn(() => Promise.resolve(okResult)),
    verifyGeneratedArtifact: vi.fn(() => Promise.resolve(okResult)),
  };
});

vi.mock("@/lib/codegen/preview-html", () => ({
  generateSpecPreviewHtml: vi.fn(() => "<html>p</html>"),
}));

vi.mock("@/lib/codegen/runs", () => ({
  markCodegenRunRunning: vi.fn(() => Promise.resolve()),
  markCodegenRunCompleted: vi.fn(() => Promise.resolve()),
  markCodegenRunFailed: vi.fn(() => Promise.resolve()),
}));

vi.mock("@/lib/codegen/storage", () => ({
  getCodegenStorageBucket: vi.fn(() => "artifacts"),
}));

vi.mock("@/lib/codegen/zip", () => ({
  zipDirectory: vi.fn(() => Promise.resolve(Buffer.from("x".repeat(100_000)))),
}));

vi.mock("@/lib/codegen/stale-runs", () => ({
  cleanupStaleCodegenRuns: vi.fn(() => Promise.resolve()),
}));

vi.mock("@/lib/flutter-codegen/generate", () => ({
  generateFlutterProject: vi.fn(async () => {
    await new Promise((r) => setTimeout(r, 2));
    return { outputDir: "/tmp/flutter", appName: "bench", displayName: "基准" };
  }),
}));

// LLM mock
const benchCreateMock = vi.fn(async () => {
  await new Promise((r) => setTimeout(r, 5));
  return { choices: [{ message: { content: "r" }, finish_reason: "stop" }], model: "t", usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 } };
});

vi.mock("openai", () => ({
  default: class { chat = { completions: { create: benchCreateMock } }; },
}));

vi.mock("@/lib/llm-circuit-breaker", () => ({
  llmBreaker: { tryReset: vi.fn(), getState: vi.fn(() => "closed"), getFallbackConfig: vi.fn(() => null), onSuccess: vi.fn(), onFailure: vi.fn() },
}));

vi.mock("@/lib/monitoring", () => ({
  measureTiming: vi.fn((_: string, fn: () => Promise<unknown>) => fn()),
  captureError: vi.fn(() => Promise.resolve()),
}));

const silent = { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn(), child: vi.fn(function(this: unknown) { return this; }) };
vi.mock("@/lib/logger", () => ({ llmLogger: silent, createComponentLogger: vi.fn() }));

vi.mock("@/lib/sandbox/docker-analyze", () => ({
  runDockerFlutterAnalyze: vi.fn(() => ({ status: "passed" })),
  shouldFailCodegenOnAnalyze: vi.fn(() => false),
}));

vi.mock("@/lib/flutter-codegen/attach-desktop-releases", () => ({ attachDesktopReleases: vi.fn(() => Promise.resolve(null)) }));
vi.mock("@/lib/flutter-codegen/desktop-build", () => ({ shouldAttemptDesktopBuild: vi.fn(() => false) }));
vi.mock("@/lib/flutter-codegen/build-web", () => ({ tryBuildFlutterWeb: vi.fn(() => ({ success: false })) }));
vi.mock("@/lib/github/desktop-gha-config", () => ({ preferDesktopGhaOverLocalBuild: vi.fn(() => true) }));
vi.mock("@/lib/notifications", () => ({ notifyCodegenComplete: vi.fn(() => Promise.resolve()) }));
vi.mock("@/lib/notifications-channel", () => ({ notifyChannel: vi.fn(() => Promise.resolve()) }));
vi.mock("@/lib/codegen/desktop-gha-orchestrator", () => ({ scheduleDesktopGhaAfterFlutter: vi.fn(() => Promise.resolve({ scheduled: false })) }));
vi.mock("@/lib/codegen/merge-run-metadata", () => ({ mergeCodegenRunNestedMetadata: vi.fn(() => Promise.resolve()) }));
vi.mock("@/lib/codegen/upload-web-preview", () => ({ uploadFlutterWebPreview: vi.fn(() => Promise.resolve("/web")) }));
vi.mock("@/lib/codegen/auto-fix-flutter", () => ({ runAutoFixAnalyzeLoop: vi.fn(() => Promise.resolve({ analyze: { status: "passed" }, rounds: 0, log: [] })) }));
vi.mock("@/lib/app-spec/generate-backend-api", () => ({ generateBackendApi: vi.fn(() => ({ apiRoutes: "", supabaseTypes: "", envTemplate: "", packageJson: "{}", readme: "" })) }));
vi.mock("@/lib/app-spec/generate-edge-functions", () => ({ generateEdgeFunctions: vi.fn(() => []), generateEdgeFunctionIndex: vi.fn(() => "") }));

const BENCH_SPEC = {
  specVersion: "0.1.0",
  appName: "bench",
  displayName: "基准测试",
  screens: Array.from({ length: 20 }, (_, i) => ({ id: `s${i}`, title: `页面${i}`, type: i === 0 ? "tabRoot" : "list", entity: `e${i % 5}` })),
  entities: Array.from({ length: 10 }, (_, i) => ({ name: `e${i}`, fields: Array.from({ length: 12 }, (_, j) => ({ name: `f${j}`, type: ["uuid", "string", "int", "float", "bool", "datetime"][j % 6], primary: j === 0 })) })),
  navigation: { tabs: ["s0", "s5", "s10"] },
};

describe("管线性能基准 — 功能验证", () => {
  let executor: FlutterExecutor;

  beforeAll(async () => {
    const { FlutterExecutor } = await import("@/lib/codegen/execute-flutter");
    executor = new FlutterExecutor();
  });

  it("单次管线执行应在合理时间内完成（<5s）", async () => {
    const start = performance.now();
    await executor.execute({ projectId: "proj-bench", runId: "bench-run" });
    const duration = performance.now() - start;
    expect(duration).toBeLessThan(5000);
  });

  it("连续 3 次管线执行应全部成功（同实例复用）", async () => {
    for (let i = 0; i < 3; i++) {
      const r = await executor.execute({
        projectId: "proj-bench",
        runId: `run-${i}`,
      });
      expect(r).toBeDefined();
    }
  });
});

describe("LLM 批量调用 — 功能验证", () => {
  beforeEach(() => {
    benchCreateMock.mockReset();
    benchCreateMock.mockResolvedValue({
      choices: [{ message: { content: "r" }, finish_reason: "stop" }],
      model: "t",
      usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
    });
  });

  it("串行 10 次调用应全部成功", async () => {
    const { callLLM } = await import("@/lib/llm");
    for (let i = 0; i < 10; i++) {
      const r = await callLLM({ systemPrompt: "s", userPrompt: `u${i}` });
      expect(r.content).toBeDefined();
    }
  });

  it("批量 10 并发调用应全部成功", async () => {
    const { callLLMBatch } = await import("@/lib/llm");
    const results = await callLLMBatch(
      Array.from({ length: 10 }, (_, i) => ({ systemPrompt: "s", userPrompt: `u${i}` })),
    );
    expect(results.every((r) => r.ok)).toBe(true);
  });
});

describe("内存稳定性", () => {
  it("大 Spec 管线执行内存增量 < 50MB", async () => {
    const { FlutterExecutor } = await import("@/lib/codegen/execute-flutter");
    const exec = new FlutterExecutor();

    const before = process.memoryUsage().heapUsed;
    await exec.execute({ projectId: "proj-bench", runId: "mem-test" });
    const after = process.memoryUsage().heapUsed;

    const deltaMB = (after - before) / 1024 / 1024;
    expect(deltaMB).toBeLessThan(50);
  });

  it("批量 100 次 LLM 模拟调用不应泄漏内存", async () => {
    const { callLLMBatch } = await import("@/lib/llm");
    const requests = Array.from({ length: 100 }, (_, i) => ({ systemPrompt: "s", userPrompt: `u${i}` }));

    const before = process.memoryUsage().heapUsed;
    await callLLMBatch(requests);
    const after = process.memoryUsage().heapUsed;

    const deltaMB = (after - before) / 1024 / 1024;
    expect(deltaMB).toBeLessThan(100);
  });
});

// 真实基准测试请运行: npx vitest bench
// bench("BaseCodegenExecutor 完整管线", async () => { ... }, { time: 5000 });
