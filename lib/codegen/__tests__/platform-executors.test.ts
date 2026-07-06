// ============================================================
// 三平台执行器单元测试
//
// 覆盖：
//   - FlutterExecutor: auto-fix + AI-fix 循环、后端 API、桌面/Web 构建
//   - WechatExecutor: 小程序编译门禁
//   - HarmonyExecutor: 鸿蒙结构校验
//   - 各平台 gate 失败和重试行为
// ============================================================

import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from "vitest";
import type { FlutterExecutor as FlutterExecutorClass } from "@/lib/codegen/execute-flutter";
import type { WechatExecutor as WechatExecutorClass } from "@/lib/codegen/execute-wechat";
import type { HarmonyExecutor as HarmonyExecutorClass } from "@/lib/codegen/execute-harmony";

// ============================================================
// Mock 基础设施
// ============================================================

vi.mock("@/lib/supabase", () => ({
  getSupabaseAdmin: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() =>
            Promise.resolve({
              data: {
                id: "proj-1",
                title: "测试应用",
                idea: "一个测试",
                final_report: null,
                status: "completed",
                spec_override: null,
              },
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
    Promise.resolve({
      spec: {
        specVersion: "0.1.0",
        appName: "test",
        displayName: "测试",
        screens: [{ id: "home", title: "首页", type: "list" }],
      },
      source: "report-llm",
      warning: null,
    }),
  ),
}));

vi.mock("@/lib/app-spec/validate", () => ({
  validateAppSpec: vi.fn((d) => ({ ok: true, spec: d })),
}));

vi.mock("@/lib/app-spec/spec-quality", () => ({
  assessSpecQuality: vi.fn(() => ({
    score: 85,
    warnings: [],
    suggestions: [],
  })),
}));

vi.mock("@/lib/app-spec/detect-todo-app", () => ({
  isTodoAppSpec: vi.fn(() => false),
}));

vi.mock("@/lib/app-spec/generate-ddl", () => ({
  generateCreateTableDDL: vi.fn(() => ({ fullSql: "SELECT 1" })),
}));

vi.mock("@/lib/codegen/artifacts", () => ({
  writeArtifactFile: vi.fn(() =>
    Promise.resolve({ relativePath: "/artifacts/proj.zip", storageUploaded: true }),
  ),
  writePreviewHtml: vi.fn(() => Promise.resolve("/preview.html")),
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
  generateSpecPreviewHtml: vi.fn(() => "<html>preview</html>"),
}));

vi.mock("@/lib/codegen/runs", () => ({
  markCodegenRunRunning: vi.fn(() => Promise.resolve()),
  markCodegenRunCompleted: vi.fn(() => Promise.resolve()),
  markCodegenRunFailed: vi.fn(() => Promise.resolve()),
  createCodegenRun: vi.fn(() =>
    Promise.resolve({ id: "run-1", project_id: "proj-1", target: "flutter", status: "queued" }),
  ),
  getCodegenRun: vi.fn(() =>
    Promise.resolve({ id: "run-1", status: "completed", artifact_path: "/a.zip", metadata: {} }),
  ),
}));

vi.mock("@/lib/codegen/storage", () => ({
  getCodegenStorageBucket: vi.fn(() => "artifacts"),
}));

vi.mock("@/lib/codegen/zip", () => ({
  zipDirectory: vi.fn(() => Promise.resolve(Buffer.from("zip"))),
}));

vi.mock("@/lib/codegen/stale-runs", () => ({
  cleanupStaleCodegenRuns: vi.fn(() => Promise.resolve()),
}));

vi.mock("@/lib/monitoring", () => ({
  captureError: vi.fn(() => Promise.resolve()),
  measureTiming: vi.fn((_: string, fn: () => Promise<unknown>) => fn()),
}));

// Flutter 特有 mocks
vi.mock("@/lib/flutter-codegen/generate", () => ({
  generateFlutterProject: vi.fn(() =>
    Promise.resolve({
      outputDir: "/tmp/flutter-out",
      appName: "test",
      displayName: "测试",
    }),
  ),
}));

vi.mock("@/lib/sandbox/docker-analyze", () => ({
  runDockerFlutterAnalyze: vi.fn(() => ({
    status: "passed",
    reason: undefined,
    output: "No issues found",
  })),
  shouldFailCodegenOnAnalyze: vi.fn(() => false),
}));

vi.mock("@/lib/codegen/auto-fix-flutter", () => ({
  runAutoFixAnalyzeLoop: vi.fn(() =>
    Promise.resolve({
      analyze: { status: "passed", output: "" },
      rounds: 0,
      log: [],
    }),
  ),
}));

vi.mock("@/lib/codegen/ai-fix-analyze", () => ({
  tryAiFixAnalyzeErrors: vi.fn(() =>
    Promise.resolve({ fixed: false, log: [] }),
  ),
}));

vi.mock("@/lib/app-spec/generate-backend-api", () => ({
  generateBackendApi: vi.fn(() => ({
    apiRoutes: "// API routes",
    supabaseTypes: "// types",
    envTemplate: "# env",
    packageJson: JSON.stringify({ name: "api" }),
    readme: "# README",
  })),
}));

vi.mock("@/lib/app-spec/generate-edge-functions", () => ({
  generateEdgeFunctions: vi.fn(() => ["export default async function() {}"]),
  generateEdgeFunctionIndex: vi.fn(() => "# Edge Functions"),
}));

vi.mock("@/lib/github/desktop-gha-config", () => ({
  preferDesktopGhaOverLocalBuild: vi.fn(() => true),
}));

vi.mock("@/lib/flutter-codegen/desktop-build", () => ({
  shouldAttemptDesktopBuild: vi.fn(() => false),
}));

vi.mock("@/lib/flutter-codegen/build-web", () => ({
  tryBuildFlutterWeb: vi.fn(() => ({ success: false })),
}));

vi.mock("@/lib/notifications-channel", () => ({
  notifyChannel: vi.fn(() => Promise.resolve()),
}));

vi.mock("@/lib/notifications", () => ({
  notifyCodegenComplete: vi.fn(() => Promise.resolve()),
}));

vi.mock("@/lib/codegen/desktop-gha-orchestrator", () => ({
  scheduleDesktopGhaAfterFlutter: vi.fn(() => Promise.resolve({ scheduled: false })),
}));

// WeChat 特有 mocks
vi.mock("@/lib/wechat-codegen/generate", () => ({
  generateWechatProject: vi.fn(() =>
    Promise.resolve({
      outputDir: "/tmp/wechat-out",
      appName: "test",
      displayName: "测试",
    }),
  ),
}));

vi.mock("@/lib/sandbox/wechat-build", () => ({
  runWechatFullBuildValidate: vi.fn(() => ({
    status: "passed",
    structure: { status: "passed" },
    compile: { status: "passed", wxmlFiles: 5, wxssFiles: 3 },
  })),
  shouldFailCodegenOnWechatBuild: vi.fn(() => false),
}));

// Harmony 特有 mocks
vi.mock("@/lib/harmony-codegen/generate", () => ({
  generateHarmonyProject: vi.fn(() =>
    Promise.resolve({
      outputDir: "/tmp/harmony-out",
      appName: "test",
      displayName: "测试",
      bundleName: "com.test.app",
      screenCount: 3,
    }),
  ),
}));

vi.mock("@/lib/sandbox/harmony-structure", () => ({
  runHarmonyStructureValidate: vi.fn(() => ({
    status: "passed",
    reason: undefined,
  })),
  shouldFailCodegenOnHarmonyStructure: vi.fn(() => false),
}));

vi.mock("@/lib/codegen/merge-run-metadata", () => ({
  mergeCodegenRunNestedMetadata: vi.fn(() => Promise.resolve()),
}));

vi.mock("@/lib/codegen/upload-web-preview", () => ({
  uploadFlutterWebPreview: vi.fn(() => Promise.resolve("/web-preview")),
}));

// ============================================================
// 测试
// ============================================================

describe("FlutterExecutor", () => {
  let FlutterExecutorCtor: typeof FlutterExecutorClass;

  beforeAll(async () => {
    ({ FlutterExecutor: FlutterExecutorCtor } = await import("@/lib/codegen/execute-flutter"));
  });

  it("应成功执行完整管线", async () => {
    const executor = new FlutterExecutorCtor();
    const result = (await executor.execute({
      projectId: "proj-1",
      runId: "run-1",
    })) as { runId: string; fileName: string };

    expect(result.runId).toBe("run-1");
    expect(result.fileName).toBe("test-flutter.zip");
  });

  it("目标应为 flutter", async () => {
    const executor = new FlutterExecutorCtor();
    expect(executor.target).toBe("flutter");
  });

  it("Docker analyze 失败时应抛出错误", async () => {
    const { shouldFailCodegenOnAnalyze } = await import(
      "@/lib/sandbox/docker-analyze"
    );
    const { runDockerFlutterAnalyze } = await import(
      "@/lib/sandbox/docker-analyze"
    );
    const { runAutoFixAnalyzeLoop } = await import(
      "@/lib/codegen/auto-fix-flutter"
    );

    // Gate 失败 + shouldFail 返回 true 且 auto-fix 也无法修复
    vi.mocked(runDockerFlutterAnalyze).mockReturnValue({
      status: "failed",
      reason: "analyze failed",
      output: "Error: Expected ;",
    } as never);
    vi.mocked(shouldFailCodegenOnAnalyze).mockReturnValue(true as never);
    vi.mocked(runAutoFixAnalyzeLoop).mockResolvedValue({
      analyze: { status: "failed", reason: "unfixable", output: "still broken" },
      rounds: 3,
      log: ["round 1 failed", "round 2 failed", "round 3 failed"],
    } as never);

    const executor = new FlutterExecutorCtor();
    await expect(
      executor.execute({ projectId: "proj-1", runId: "run-1" }),
    ).rejects.toThrow(/analyze/);

    // Reset mocks
    vi.mocked(shouldFailCodegenOnAnalyze).mockReturnValue(false as never);
    vi.mocked(runDockerFlutterAnalyze).mockReturnValue({ status: "passed" } as never);
    vi.mocked(runAutoFixAnalyzeLoop).mockResolvedValue({
      analyze: { status: "passed" },
      rounds: 0,
      log: [],
    } as never);
  });
});

describe("WechatExecutor", () => {
  let WechatExecutorCtor: typeof WechatExecutorClass;

  beforeAll(async () => {
    ({ WechatExecutor: WechatExecutorCtor } = await import("@/lib/codegen/execute-wechat"));
  });

  it("应成功执行完整管线", async () => {
    const executor = new WechatExecutorCtor();
    const result = (await executor.execute({
      projectId: "proj-1",
      runId: "run-1",
    })) as { runId: string; fileName: string; build: unknown };

    expect(result.runId).toBe("run-1");
    expect(result.fileName).toBe("test-wechat.zip");
    expect(result.build).toBeDefined();
  });

  it("目标应为 wechat", async () => {
    const executor = new WechatExecutorCtor();
    expect(executor.target).toBe("wechat");
  });

  it("编译门禁失败时应抛出错误", async () => {
    const { shouldFailCodegenOnWechatBuild } = await import(
      "@/lib/sandbox/wechat-build"
    );
    const { runWechatFullBuildValidate } = await import(
      "@/lib/sandbox/wechat-build"
    );

    vi.mocked(runWechatFullBuildValidate).mockReturnValueOnce({
      status: "failed",
      reason: "编译失败",
      output: "Error: WXML parse error",
      structure: { status: "passed" },
      compile: { status: "failed" },
    } as never);
    vi.mocked(shouldFailCodegenOnWechatBuild).mockReturnValueOnce(true as never);

    const executor = new WechatExecutorCtor();
    await expect(
      executor.execute({ projectId: "proj-1", runId: "run-1" }),
    ).rejects.toThrow(/编译门禁/);

    vi.mocked(shouldFailCodegenOnWechatBuild).mockReturnValue(false as never);
    vi.mocked(runWechatFullBuildValidate).mockReturnValue({
      status: "passed",
      structure: { status: "passed" },
      compile: { status: "passed" },
    } as never);
  });
});

describe("HarmonyExecutor", () => {
  let HarmonyExecutorCtor: typeof HarmonyExecutorClass;

  beforeAll(async () => {
    ({ HarmonyExecutor: HarmonyExecutorCtor } = await import("@/lib/codegen/execute-harmony"));
  });

  it("应成功执行完整管线", async () => {
    const executor = new HarmonyExecutorCtor();
    const result = (await executor.execute({
      projectId: "proj-1",
      runId: "run-1",
    })) as { runId: string; fileName: string };

    expect(result.runId).toBe("run-1");
    expect(result.fileName).toBe("com.test.app-harmony.zip");
  });

  it("目标应为 harmony", async () => {
    const executor = new HarmonyExecutorCtor();
    expect(executor.target).toBe("harmony");
  });

  it("结构门禁失败时应抛出错误", async () => {
    const { shouldFailCodegenOnHarmonyStructure } = await import(
      "@/lib/sandbox/harmony-structure"
    );
    const { runHarmonyStructureValidate } = await import(
      "@/lib/sandbox/harmony-structure"
    );

    vi.mocked(runHarmonyStructureValidate).mockReturnValueOnce({
      status: "failed",
      reason: "结构校验失败：缺少 module.json5",
    } as never);
    vi.mocked(shouldFailCodegenOnHarmonyStructure).mockReturnValueOnce(true as never);

    const executor = new HarmonyExecutorCtor();
    await expect(
      executor.execute({ projectId: "proj-1", runId: "run-1" }),
    ).rejects.toThrow(/结构门禁/);

    vi.mocked(shouldFailCodegenOnHarmonyStructure).mockReturnValue(false as never);
    vi.mocked(runHarmonyStructureValidate).mockReturnValue({
      status: "passed",
    } as never);
  });

  it("无 bundleName 应回退到 appName", async () => {
    const { generateHarmonyProject } = await import(
      "@/lib/harmony-codegen/generate"
    );
    vi.mocked(generateHarmonyProject).mockResolvedValueOnce({
      outputDir: "/tmp/harmony-out",
      appName: "app",
      displayName: "App",
      bundleName: undefined,
      screenCount: 1,
    } as never);

    const executor = new HarmonyExecutorCtor();
    const result = (await executor.execute({
      projectId: "proj-1",
      runId: "run-1",
    })) as { fileName: string };
    expect(result.fileName).toBe("app-harmony.zip");
  });
});

// ============================================================
// 边界情况：并发安全
// ============================================================

describe("并发安全", () => {
  it("三个平台应可同时并行执行", async () => {
    const [FlutterExecutor, WechatExecutor, HarmonyExecutor] = await Promise.all([
      import("@/lib/codegen/execute-flutter"),
      import("@/lib/codegen/execute-wechat"),
      import("@/lib/codegen/execute-harmony"),
    ]);

    const tasks = [
      new FlutterExecutor.FlutterExecutor().execute({ projectId: "p1", runId: "r1" }),
      new WechatExecutor.WechatExecutor().execute({ projectId: "p2", runId: "r2" }),
      new HarmonyExecutor.HarmonyExecutor().execute({ projectId: "p3", runId: "r3" }),
    ];

    const results = await Promise.allSettled(tasks);
    results.forEach((r) => {
      expect(r.status).toBe("fulfilled");
    });
  });
});
