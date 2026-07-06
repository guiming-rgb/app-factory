"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CodegenTargetCards } from "@/components/CodegenTargetCard";
import { useCodegenRuns, type CodegenRun } from "@/components/hooks/useCodegenRuns";
import { useCodegenActions } from "./CodegenPanel/useCodegenActions";
import { CodegenStatusBar } from "./CodegenPanel/CodegenStatusBar";
import { CodegenGenerateButtons } from "./CodegenPanel/CodegenGenerateButtons";
import { CodegenRunHistory } from "./CodegenPanel/CodegenRunHistory";

function isDesktopGhaPending(run: CodegenRun): boolean {
  if (run.target !== "flutter" || run.status !== "completed") return false;
  const s = (run.metadata as Record<string, unknown> | null)?.desktopGha as { status?: string } | undefined;
  return s?.status === "queued" || s?.status === "running";
}

export function CodegenPanel({ projectId, initialRuns = [], embedded = false }: {
  projectId: string; initialRuns?: CodegenRun[]; embedded?: boolean;
}) {
  const { runs, setRuns, error, setError, inngestHint, fetchRuns, fetchSingleRun, startPolling } = useCodegenRuns(projectId);
  const { loadingTarget, pushingRunId, pushingAll, cancelingRunId, copiedRepoRunId,
    specQuality, syncProgress, successMsg,
    handleGenerate, handlePush, handleCancel, handlePushAll, handleCopyRepo, handleGenerateAll
  } = useCodegenActions(projectId);

  const [hideFailedRuns, setHideFailedRuns] = useState(true);
  useEffect(() => { if (initialRuns.length > 0) setRuns(initialRuns); }, []); // eslint-disable-line

  const activeRun = runs.find((r) => r.status === "queued" || r.status === "running");
  const failedRunCount = runs.filter((r) => r.status === "failed").length;
  const visibleRuns = useMemo(
    () => hideFailedRuns ? runs.filter((r) => r.status !== "failed") : runs,
    [hideFailedRuns, runs]
  );
  const shellClass = embedded ? "mt-4" : "mt-4 rounded-xl border border-violet-200 bg-violet-50/60 p-4";

  const doGenerate = useCallback((t: string) => { void handleGenerate(t as "flutter" | "wechat" | "harmony", fetchSingleRun, fetchRuns, startPolling, setError); }, [handleGenerate, fetchSingleRun, fetchRuns, startPolling, setError]);
  const doPush = useCallback((id: string) => { void handlePush(id, fetchRuns, setError); }, [handlePush, fetchRuns, setError]);
  const doCancel = useCallback((id: string) => { void handleCancel(id, fetchRuns, setError); }, [handleCancel, fetchRuns, setError]);
  const doPushAll = useCallback(() => { void handlePushAll(fetchRuns, setError); }, [handlePushAll, fetchRuns, setError]);
  const doCopyRepo = useCallback((id: string, u: string) => { void handleCopyRepo(id, u, setError); }, [handleCopyRepo, setError]);
  const doGenerateAll = useCallback(() => { void handleGenerateAll(["flutter", "wechat", "harmony"], fetchRuns, setError); }, [handleGenerateAll, fetchRuns, setError]);

  return (
    <div className={shellClass}>
      {!embedded && <p className="text-sm font-medium text-violet-950">代码生成（同步优先）</p>}
      {embedded && <p className="text-sm font-medium text-violet-950">同步生成与历史记录</p>}
      <p className="mt-1 text-xs text-violet-800/80">三栈同步生成。Flutter 可额外产出 Mac .app / Win .exe 可双击包（GHA 构建）。</p>
      <CodegenStatusBar inngestHint={inngestHint} specQuality={specQuality} successMsg={successMsg} syncProgress={syncProgress} />
      <CodegenTargetCards runs={runs} />
      <CodegenGenerateButtons projectId={projectId} loadingTarget={loadingTarget} activeRun={activeRun}
        pushingAll={pushingAll} pushingRunId={pushingRunId}
        hideFailedRuns={hideFailedRuns} failedRunCount={failedRunCount}
        doGenerate={doGenerate} doGenerateAll={doGenerateAll} doPushAll={doPushAll}
        fetchRuns={fetchRuns} setHideFailedRuns={setHideFailedRuns} />
      <CodegenRunHistory error={error} activeRun={activeRun} hideFailedRuns={hideFailedRuns}
        failedRunCount={failedRunCount} runs={runs} visibleRuns={visibleRuns}
        loadingTarget={loadingTarget} pushingRunId={pushingRunId}
        cancelingRunId={cancelingRunId} copiedRepoRunId={copiedRepoRunId}
        doGenerate={doGenerate} doPush={doPush} doCancel={doCancel} doCopyRepo={doCopyRepo}
        setHideFailedRuns={setHideFailedRuns} />
    </div>
  );
}
