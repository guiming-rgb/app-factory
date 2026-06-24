"use client";

import type { CodegenRun } from "@/components/hooks/useCodegenRuns";
import { CodegenRunRow } from "@/components/CodegenRunRow";
import { TARGET_LABEL } from "./useCodegenActions";

type Props = {
  error: string | null;
  activeRun: CodegenRun | undefined;
  hideFailedRuns: boolean;
  failedRunCount: number;
  runs: CodegenRun[];
  visibleRuns: CodegenRun[];
  loadingTarget: string | null;
  pushingRunId: string | null;
  cancelingRunId: string | null;
  copiedRepoRunId: string | null;
  doGenerate: (target: string) => void;
  doPush: (runId: string) => void;
  doCancel: (runId: string) => void;
  doCopyRepo: (runId: string, url: string) => void;
  setHideFailedRuns: (v: boolean) => void;
};

/**
 * Codegen 运行历史表格：状态、门禁、操作列
 */
export function CodegenRunHistory({
  error,
  activeRun,
  hideFailedRuns,
  failedRunCount,
  runs,
  visibleRuns,
  loadingTarget,
  pushingRunId,
  cancelingRunId,
  copiedRepoRunId,
  doGenerate,
  doPush,
  doCancel,
  doCopyRepo,
  setHideFailedRuns,
}: Props) {
  return (
    <>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

      {activeRun && (
        <p className="mt-2 text-xs text-violet-900">
          当前任务：{TARGET_LABEL[activeRun.target]} · 约每 3 秒自动刷新
        </p>
      )}

      {runs.length > 0 && visibleRuns.length === 0 && hideFailedRuns && (
        <p className="mt-3 text-xs text-violet-700">
          已折叠 {failedRunCount} 条。{" "}
          <button
            type="button"
            className="font-medium text-violet-900 underline"
            onClick={() => setHideFailedRuns(false)}
          >
            展开查看
          </button>
        </p>
      )}

      {visibleRuns.length > 0 && (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[480px] text-left text-xs text-violet-950">
            <thead>
              <tr className="border-b border-violet-200 text-violet-700">
                <th className="py-2 pr-2 font-medium">类型</th>
                <th className="py-2 pr-2 font-medium">状态</th>
                <th className="py-2 pr-2 font-medium">Spec 来源</th>
                <th className="py-2 pr-2 font-medium">门禁</th>
                <th className="py-2 pr-2 font-medium">产物</th>
                <th className="py-2 font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {visibleRuns.slice(0, 8).map((run) => (
                <CodegenRunRow
                  key={run.id}
                  run={run}
                  onGenerate={doGenerate}
                  onPush={doPush}
                  onCancel={doCancel}
                  loadingTarget={loadingTarget}
                  activeRun={activeRun}
                  pushingRunId={pushingRunId}
                  cancelingRunId={cancelingRunId}
                  copiedRepoRunId={copiedRepoRunId}
                  onCopyRepo={doCopyRepo}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
