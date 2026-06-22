"use client";

import { useEffect, useState } from "react";

import { CopyTextButton } from "@/components/CopyTextButton";
import { GitHubConnectButton } from "@/components/GitHubConnectButton";
import { CodegenTargetCards } from "@/components/CodegenTargetCard";
import { CodegenRunRow } from "@/components/CodegenRunRow";
import { useCodegenRuns, type CodegenRun } from "@/components/hooks/useCodegenRuns";

import { useCodegenActions, TARGET_LABEL } from "./CodegenPanel/useCodegenActions";

const SPEC_QUALITY_WARN = 60;
type CodegenTarget = "flutter" | "wechat" | "harmony";

function isDesktopGhaPending(run: CodegenRun): boolean {
  if (run.target !== "flutter" || run.status !== "completed") return false;
  const s = (run.metadata as Record<string, unknown> | null)?.desktopGha as { status?: string } | undefined;
  return s?.status === "queued" || s?.status === "running";
}

export function CodegenPanel({
  projectId,
  initialRuns = [],
  embedded = false,
}: {
  projectId: string;
  initialRuns?: CodegenRun[];
  embedded?: boolean;
}) {
  const { runs, setRuns, error, setError, inngestHint, fetchRuns, fetchSingleRun, startPolling } = useCodegenRuns(projectId);
  const {
    loadingTarget, pushingRunId, pushingAll, cancelingRunId, copiedRepoRunId,
    specQuality, syncProgress, successMsg,
    handleGenerate, handlePush, handleCancel, handlePushAll, handleCopyRepo, handleGenerateAll
  } = useCodegenActions(projectId);

  const [hideFailedRuns, setHideFailedRuns] = useState(true);

  // 初始化
  useEffect(() => {
    if (initialRuns.length > 0) setRuns(initialRuns);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeRun = runs.find((r) => r.status === "queued" || r.status === "running");
  const failedRunCount = runs.filter((r) => r.status === "failed").length;
  const visibleRuns = hideFailedRuns ? runs.filter((r) => r.status !== "failed") : runs;
  const shellClass = embedded ? "mt-4" : "mt-4 rounded-xl border border-violet-200 bg-violet-50/60 p-4";

  const doGenerate = (target: CodegenTarget) => { void handleGenerate(target, fetchSingleRun, fetchRuns, startPolling, setError); };
  const doPush = (runId: string) => { void handlePush(runId, fetchRuns, setError); };
  const doCancel = (runId: string) => { void handleCancel(runId, fetchRuns, setError); };
  const doPushAll = () => { void handlePushAll(fetchRuns, setError); };
  const doCopyRepo = (runId: string, url: string) => { void handleCopyRepo(runId, url, setError); };
  const doGenerateAll = () => { void handleGenerateAll(["flutter", "wechat", "harmony"], fetchRuns, setError); };

  return (
    <div className={shellClass}>
      {!embedded && <p className="text-sm font-medium text-violet-950">代码生成（同步优先）</p>}
      {embedded && <p className="text-sm font-medium text-violet-950">同步生成与历史记录</p>}
      <p className="mt-1 text-xs text-violet-800/80">三栈同步生成。Flutter 可额外产出 Mac .app / Win .exe 可双击包（GHA 构建）。</p>

      {inngestHint && <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">⚠ Inngest：{inngestHint}</p>}
      {specQuality && (
        <p data-specQualityScore={specQuality.score} className={`mt-2 rounded-lg border px-3 py-2 text-xs ${specQuality.score < SPEC_QUALITY_WARN ? 'border-orange-200 bg-orange-50 text-orange-950' : 'border-emerald-200 bg-emerald-50 text-emerald-900'}`}>
          Spec 质量 {specQuality.score}/100 {specQuality.score < SPEC_QUALITY_WARN ? '偏低' : ''}{specQuality.warnings.length > 0 ? ` · ${specQuality.warnings.slice(0, 2).join('；')}` : ''}
        </p>
      )}

      <CodegenTargetCards runs={runs} />

      {successMsg && <p className="mt-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900">✅ {successMsg}</p>}
      {syncProgress && <p className="mt-2 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-xs text-violet-900"><span className="inline-block animate-pulse">●</span> {syncProgress}</p>}

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <GitHubConnectButton nextPath={`/projects/${projectId}`} />
        <button type="button" disabled={pushingAll || !!pushingRunId} onClick={doPushAll} className="rounded-lg border border-gray-800 px-3 py-1.5 text-xs font-medium text-gray-900 hover:bg-gray-100 disabled:opacity-50">
          {pushingAll ? "三栈推送中…" : "一键推三栈 GitHub"}
        </button>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {(["flutter", "wechat", "harmony"] as CodegenTarget[]).map((target) => (
          <button key={target} type="button" disabled={!!loadingTarget || !!activeRun} onClick={() => doGenerate(target)}
            className={`rounded-lg px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50 ${target === "flutter" ? "bg-violet-700 text-white" : target === "wechat" ? "border border-violet-600 text-violet-800" : "border border-emerald-700 text-emerald-900"}`}>
            {loadingTarget === target ? "提交中…" : activeRun?.target === target ? `${TARGET_LABEL[target]} 生成中…` : `生成 ${TARGET_LABEL[target]} ZIP（同步）`}
          </button>
        ))}
        <button type="button" disabled={!!loadingTarget || !!activeRun} onClick={doGenerateAll} className="rounded-lg bg-gradient-to-r from-violet-700 to-emerald-700 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50">
          {loadingTarget ? "生成中…" : "一键三栈生成（并行）"}
        </button>
        <button type="button" disabled={false} onClick={() => void fetchRuns().catch(() => {})} className="rounded-lg border border-violet-300 px-3 py-2 text-xs text-violet-800">刷新记录</button>
        {failedRunCount > 0 && (
          <label className="flex cursor-pointer items-center gap-1.5 text-xs text-violet-800">
            <input type="checkbox" checked={hideFailedRuns} onChange={(e) => setHideFailedRuns(e.target.checked)} className="rounded border-violet-300" />
            折叠失败记录（{failedRunCount}）
          </label>
        )}
      </div>

      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      {activeRun && <p className="mt-2 text-xs text-violet-900">当前任务：{TARGET_LABEL[activeRun.target]} · 约每 3 秒自动刷新</p>}
      {runs.length > 0 && visibleRuns.length === 0 && hideFailedRuns && (
        <p className="mt-3 text-xs text-violet-700">已折叠 {failedRunCount} 条。 <button type="button" className="font-medium text-violet-900 underline" onClick={() => setHideFailedRuns(false)}>展开查看</button></p>
      )}

      {visibleRuns.length > 0 && (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[480px] text-left text-xs text-violet-950">
            <thead>
              <tr className="border-b border-violet-200 text-violet-700">
                <th className="py-2 pr-2 font-medium">类型</th><th className="py-2 pr-2 font-medium">状态</th><th className="py-2 pr-2 font-medium">Spec 来源</th>
                <th className="py-2 pr-2 font-medium">门禁</th><th className="py-2 pr-2 font-medium">产物</th><th className="py-2 font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {visibleRuns.slice(0, 8).map((run) => (
                <CodegenRunRow key={run.id} run={run} onGenerate={doGenerate} onPush={doPush} onCancel={doCancel}
                  loadingTarget={loadingTarget} activeRun={activeRun} pushingRunId={pushingRunId} cancelingRunId={cancelingRunId}
                  copiedRepoRunId={copiedRepoRunId} onCopyRepo={doCopyRepo} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
