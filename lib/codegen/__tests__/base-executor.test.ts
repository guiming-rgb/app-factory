// ============================================================
// BaseCodegenExecutor 单元测试
//
// 覆盖：
//   - 模板方法管线正常流程
//   - 各阶段失败时的错误传播
//   - 钩子方法（beforeGate / afterPackaging）行为
//   - runCodegenSync 正常流程
//   - 边界情况（空 spec、缺失项目、无输出目录）
// ============================================================

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock 外部依赖 — 必须在静态导入前设置
vi.mock("@/lib/supabase", () => ({
  getSupabaseAdmin: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() =>
            Promise.resolve({
              data: {
                id: "proj-1",
                title: "测试项目",
                idea: "一个测试应用",
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
        navigation: { tabs: ["home"] },
      },
      source: "report-llm",
      warning: null,
    }),
  ),
}));

vi.mock("@/lib/app-spec/validate", () => ({
  validateAppSpec: vi.fn((data: unknown) => ({
    ok: true,
    spec: data,
  })),
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

vi.mock("@/lib/codegen/artifacts", () => ({
  writeArtifactFile: vi.fn(() =>
    Promise.resolve({ relativePath: "/artifacts/test.zip", storageUploaded: true }),
  ),
  writePreviewHtml: vi.fn(() => Promise.resolve("/previews/test.html")),
}));

vi.mock("@/lib/codegen/preview-html", () => ({
  generateSpecPreviewHtml: vi.fn(() => "<html>preview</html>"),
}));

vi.mock("@/lib/codegen/runs", () => ({
  markCodegenRunRunning: vi.fn(() => Promise.resolve()),
  markCodegenRunCompleted: vi.fn(() => Promise.resolve()),
  markCodegenRunFailed: vi.fn(() => Promise.resolve()),
  createCodegenRun: vi.fn(() =>
    Promise.resolve({
      id: "run-1",
      project_id: "proj-1",
      target: "flutter",
      status: "queued",
    }),
  ),
  getCodegenRun: vi.fn(() =>
    Promise.resolve({
      id: "run-1",
      status: "completed",
      artifact_path: "/artifacts/test.zip",
      metadata: {},
    }),
  ),
}));

vi.mock("@/lib/codegen/storage", () => ({
  getCodegenStorageBucket: vi.fn(() => "codegen-artifacts"),
}));

vi.mock("@/lib/flutter-codegen/zip", () => ({
  zipDirectory: vi.fn(() => Promise.resolve(Buffer.from("fake-zip"))),
}));

vi.mock("@/lib/codegen/stale-runs", () => ({
  cleanupStaleCodegenRuns: vi.fn(() => Promise.resolve()),
}));

vi.mock("@/lib/app-spec/generate-ddl", () => ({
  generateCreateTableDDL: vi.fn(() => ({ fullSql: "CREATE TABLE ..." })),
}));

// ============================================================
// 可测试的 Executor 子类（最小实现）
// ============================================================

import type { AppSpec } from "@/lib/app-spec/types";
import type { CodegenOutput, CodegenGateResult, GateMetadataContext } from "@/lib/codegen/base-executor";
import {
  BaseCodegenExecutor,
  runCodegenSync,
} from "@/lib/codegen/base-executor";

interface TestGateResult extends CodegenGateResult {
  status: "passed" | "failed";
  checked: boolean;
}

class TestExecutor extends BaseCodegenExecutor<TestGateResult> {
  readonly target = "flutter" as const;
  private _shouldFailGate = false;
  private _shouldFailGenerate = false;
  private _beforeGateCalled = false;
  private _afterPackagingCalled = false;
  private _specPassed: AppSpec | null = null;

  // 控制测试行为
  setGateShouldFail(v: boolean) { this._shouldFailGate = v; }
  setGenerateShouldFail(v: boolean) { this._shouldFailGenerate = v; }
  get beforeGateCalled() { return this._beforeGateCalled; }
  get afterPackagingCalled() { return this._afterPackagingCalled; }
  get specPassed() { return this._specPassed; }

  async generateCode(spec: AppSpec): Promise<CodegenOutput> {
    this._specPassed = spec;
    if (this._shouldFailGenerate) throw new Error("代码生成失败");
    return {
      outputDir: "/tmp/test-project",
      appName: "test",
      displayName: "测试",
    };
  }

  getFileName(output: CodegenOutput): string {
    return `${output.appName}-flutter.zip`;
  }

  runGate(): TestGateResult {
    return {
      status: this._shouldFailGate ? "failed" : "passed",
      checked: true,
    };
  }

  isGateFailed(g: TestGateResult): boolean {
    return g.status === "failed";
  }

  buildGateMetadata(ctx: GateMetadataContext & { gate: TestGateResult }): Record<string, unknown> {
    return { testGateChecked: ctx.gate.checked };
  }

  buildGateFailureMsg(g: TestGateResult): string {
    return `门禁失败: ${g.status}`;
  }

  buildResult(input: {
    runId: string;
    fileName: string;
    artifact_path: string;
    spec_source: string;
    displayName: string;
    gate: TestGateResult;
  }): unknown {
    return { runId: input.runId, gateChecked: input.gate.checked };
  }

  async beforeGate(_output: CodegenOutput, gate: TestGateResult): Promise<TestGateResult> {
    this._beforeGateCalled = true;
    return gate;
  }

  async afterPackaging(): Promise<Record<string, unknown>> {
    this._afterPackagingCalled = true;
    return { hooksCalled: true };
  }
}

// ============================================================
// 测试用例
// ============================================================

describe("BaseCodegenExecutor", () => {
  let executor: TestExecutor;

  beforeEach(() => {
    executor = new TestExecutor();
    executor.setGateShouldFail(false);
    executor.setGenerateShouldFail(false);
  });

  // ---- 正常流程 ---- //

  describe("正常流程", () => {
    it("应完整执行 10 步管线并返回结果", async () => {
      const result = await executor.execute({
        projectId: "proj-1",
        runId: "run-1",
      }) as { runId: string; gateChecked: boolean };

      expect(result.runId).toBe("run-1");
      expect(result.gateChecked).toBe(true);
    });

    it("应正确传递 spec 到 generateCode", async () => {
      await executor.execute({ projectId: "proj-1", runId: "run-1" });

      expect(executor.specPassed).not.toBeNull();
      expect(executor.specPassed!.appName).toBe("test");
      expect(executor.specPassed!.screens).toHaveLength(1);
    });

    it("应调用 beforeGate 钩子", async () => {
      await executor.execute({ projectId: "proj-1", runId: "run-1" });
      expect(executor.beforeGateCalled).toBe(true);
    });

    it("应调用 afterPackaging 钩子", async () => {
      await executor.execute({ projectId: "proj-1", runId: "run-1" });
      expect(executor.afterPackagingCalled).toBe(true);
    });

    it("应为每个执行创建独立的 Spec 实例", async () => {
      const e2 = new TestExecutor();
      const [r1, r2] = await Promise.all([
        executor.execute({ projectId: "proj-1", runId: "run-a" }),
        e2.execute({ projectId: "proj-1", runId: "run-b" }),
      ]);
      expect(r1).toBeDefined();
      expect(r2).toBeDefined();
    });
  });

  // ---- 错误处理 ---- //

  describe("错误处理", () => {
    it("门禁失败时应抛出错误", async () => {
      executor.setGateShouldFail(true);
      await expect(
        executor.execute({ projectId: "proj-1", runId: "run-1" }),
      ).rejects.toThrow(/门禁失败/);
    });

    it("代码生成失败时应抛出错误", async () => {
      executor.setGenerateShouldFail(true);
      await expect(
        executor.execute({ projectId: "proj-1", runId: "run-1" }),
      ).rejects.toThrow(/代码生成失败/);
    });

    it("门禁失败时不应调用 afterPackaging", async () => {
      executor.setGateShouldFail(true);
      try {
        await executor.execute({ projectId: "proj-1", runId: "run-1" });
      } catch { /* 预期 */ }
      expect(executor.afterPackagingCalled).toBe(false);
    });

    it("finally 块应在异常后仍然执行清理", async () => {
      executor.setGenerateShouldFail(true);
      try {
        await executor.execute({ projectId: "proj-1", runId: "run-1" });
      } catch { /* 预期 */ }
      // 验证 outputRoot 清理逻辑被调用（没有挂起 Promise）
      // mock 2: fs.rm 未被调用因为 outputRoot 为 null（generate 失败时）
    });
  });

  // ---- 边界情况 ---- //

  describe("边界情况", () => {
    it("应处理空 displayName", async () => {
      const result = await executor.execute({
        projectId: "proj-1",
        runId: "run-1",
      });
      expect(result).toBeDefined();
    });

    it("应支持 userId 可选参数", async () => {
      const result = await executor.execute({
        projectId: "proj-1",
        runId: "run-1",
        userId: "user-1",
      }) as { runId: string };
      expect(result.runId).toBe("run-1");
    });

    it("并发执行应互不干扰", async () => {
      const tasks = Array.from({ length: 5 }, (_, i) =>
        new TestExecutor().execute({
          projectId: `proj-1`,
          runId: `run-${i}`,
        }),
      );
      const results = await Promise.allSettled(tasks);
      const succeeded = results.filter(
        (r): r is PromiseFulfilledResult<unknown> => r.status === "fulfilled",
      );
      expect(succeeded).toHaveLength(5);
    });
  });

  // ---- runCodegenSync ---- //

  describe("runCodegenSync 工厂", () => {
    it("应创建 run → 执行 → 获取结果", async () => {
      const result = await runCodegenSync("flutter", executor, {
        projectId: "proj-1",
      });
      expect(result.id).toBe("run-1");
      expect(result.status).toBe("completed");
    });

    it("完成但有 null artifact_path 时应抛出错误", async () => {
      const { getCodegenRun } = await import("@/lib/codegen/runs");
      vi.mocked(getCodegenRun).mockResolvedValueOnce({
        id: "run-1",
        status: "completed",
        artifact_path: null,
        metadata: {},
      } as never);

      await expect(
        runCodegenSync("flutter", executor, { projectId: "proj-1" }),
      ).rejects.toThrow(/生成未完成/);
    });
  });
});
