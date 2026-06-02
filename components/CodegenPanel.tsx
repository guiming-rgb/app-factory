"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { CopyTextButton } from "@/components/CopyTextButton";
import { GitHubConnectButton } from "@/components/GitHubConnectButton";
import { CodegenTargetCards } from "@/components/CodegenTargetCard";
import { CodegenRunRow } from "@/components/CodegenRunRow";
import { useCodegenRuns, type CodegenRun } from "@/components/hooks/useCodegenRuns";
import {
  classifyCodegenFailure,
  latestRunByTarget,
  type CodegenTarget as QualityTarget,
} from "@/lib/codegen/format-run-quality";

const TARGET_LABEL: Record<string, string> = { flutter: "Flutter", wechat: "微信小程序", harmony: "鸿蒙 ArkTS" };
const SPEC_QUALITY_WARN = 60;

type CodegenTarget = "flutter" | "wechat" | "harmony";

type SpecQualityPreview = { score: number; warnings: string[] };

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
  const [loadingTarget, setLoadingTarget] = useState<CodegenTarget | null>(null);
  const [pushingRunId, setPushingRunId] = useState<string | null>(null);
  const [pushingAll, setPushingAll] = useState(false);
  const [cancelingRunId, setCancelingRunId] = useState<string | null>(null);
  const [hideFailedRuns, setHideFailedRuns] = useState(true);
  const [copiedRepoRunId, setCopiedRepoRunId] = useState<string | null>(null);
  const [specQuality, setSpecQuality] = useState<SpecQualityPreview | null>(null);
  const [syncProgress, setSyncProgress] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 初始化
  useEffect(() => {
    // Avoid duplicate: useCodegenRuns already fetches initial data if runs is empty in the hook
    // but here we set initial runs passed from server
    if (initialRuns.length > 0) setRuns(initialRuns);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    void fetch(`/api/projects/${projectId}/spec`, { cache: "no-store" })
      .then((r) => r.json())
      .then((data: { quality?: SpecQualityPreview }) => { if (data.quality) setSpecQuality(data.quality); })
      .catch(() => {});
  }, [projectId]);

  useEffect(() => { return () => { if (successTimerRef.current) clearTimeout(successTimerRef.current); }; }, []);

  function showSuccess(message: string) {
    setSuccessMsg(message);
    if (successTimerRef.current) clearTimeout(successTimerRef.current);
    successTimerRef.current = setTimeout(() => setSuccessMsg(null), 8000);
  }

  async function handleGenerate(target: CodegenTarget) {
    setLoadingTarget(target);
    setError("");
    try {
      const specRes = await fetch(`/api/projects/${projectId}/spec`, { cache: "no-store" });
      if (specRes.ok) {
        const specData = (await specRes.json()) as { quality?: SpecQualityPreview };
        if (specData.quality) {
          setSpecQuality(specData.quality);
          if (specData.quality.score < SPEC_QUALITY_WARN) {
            if (!window.confirm(`Spec 质量 ${specData.quality.score}/100 偏低\n${specData.quality.warnings.slice(0, 3).join("；") || ""}\n\n仍要生成吗？`)) return;
          }
        }
      }
      setSyncProgress(`${TARGET_LABEL[target]} 同步生成中（通常 10–30 秒）…`);
      const res = await fetch(`/api/projects/${projectId}/codegen/${target}`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "启动 codegen 失败");
      const updated = await fetchSingleRun(data.runId as string);
      if (updated.status === "completed") { showSuccess(`${TARGET_LABEL[target]} 已完成`); await fetchRuns(); }
      else if (updated.status === "failed") { setError(classifyCodegenFailure(updated.metadata as Record<string, unknown> ?? {}, updated.log).detail); await fetchRuns(); }
      else startPolling(data.runId as string);
    } catch (err: unknown) { setError(err instanceof Error ? err.message : "启动 codegen 失败"); }
    finally { setLoadingTarget(null); setSyncProgress(null); }
  }

  async function handlePush(runId: string) {
    setPushingRunId(runId); setError("");
    try {
      const res = await fetch(`/api/projects/${projectId}/codegen/runs/${runId}/github-push`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.code === "github_not_connected" ? "请先连接 GitHub" : data?.error ?? "推送失败");
      await fetchRuns();
    } catch (err: unknown) { setError(err instanceof Error ? err.message : "推送失败"); }
    finally { setPushingRunId(null); }
  }

  async function handleCancel(runId: string) {
    setCancelingRunId(runId); setError("");
    try {
      const res = await fetch(`/api/projects/${projectId}/codegen/runs/${runId}/cancel`, { method: "POST" });
      if (!res.ok) throw new Error((await res.json())?.error ?? "取消失败");
      await fetchRuns();
    } catch (err: unknown) { setError(err instanceof Error ? err.message : "取消失败"); }
    finally { setCancelingRunId(null); }
  }

  async function handlePushAll() {
    setPushingAll(true); setError("");
    try {
      const res = await fetch(`/api/projects/${projectId}/codegen/github-push-all`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ensure: true }) });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data?.errors?.length ? data.errors.map((e: { target: string; error: string }) => `${e.target}: ${e.error}`).join(" · ") : data?.error ?? "三栈 push 失败");
      await fetchRuns();
    } catch (err: unknown) { setError(err instanceof Error ? err.message : "三栈 push 失败"); }
    finally { setPushingAll(false); }
  }

  async function handleCopyRepo(runId: string, url: string) {
    try { await navigator.clipboard.writeText(url); setCopiedRepoRunId(runId); setTimeout(() => setCopiedRepoRunId(null), 2000); }
    catch { setError("复制失败"); }
  }

  const activeRun = runs.find((r) => r.status === "queued" || r.status === "running");
  const failedRunCount = runs.filter((r) => r.status === "failed").length;
  const visibleRuns = hideFailedRuns ? runs.filter((r) => r.status !== "failed") : runs;
  const shellClass = embedded ? "mt-4" : "mt-4 rounded-xl border border-violet-200 bg-violet-50/60 p-4";

  return (
    <div className={shellClass}>
      {!embedded && <p className="text-sm font-medium text-violet-950">代码生成（同步优先）</p>}
      {embedded && <p className="text-sm font-medium text-violet-950">同步生成与历史记录</p>}
      <p className="mt-1 text-xs text-violet-800/80">三栈同步生成。Flutter 可额外产出 Mac .app / Win .exe 可双击包（GHA 构建）。</p>

      {inngestHint ? <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">⚠ Inngest：{inngestHint}</p> : null}
      {specQuality && specQuality.score < SPEC_QUALITY_WARN ? <p className="mt-2 rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-xs text-orange-950">⚠ Spec 质量 {specQuality.score}/100 偏低</p> : null}

      <CodegenTargetCards runs={runs} />

      {successMsg ? <p className="mt-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900">✅ {successMsg}</p> : null}
      {syncProgress ? <p className="mt-2 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-xs text-violet-900"><span className="inline-block animate-pulse">●</span> {syncProgress}</p> : null}

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <GitHubConnectButton nextPath={`/projects/${projectId}`} />
        <button type="button" disabled={pushingAll || !!pushingRunId} onClick={() => void handlePushAll()} className="rounded-lg border border-gray-800 px-3 py-1.5 text-xs font-medium text-gray-900 hover:bg-gray-100 disabled:opacity-50">
          {pushingAll ? "三栈推送中…" : "一键推三栈 GitHub"}
        </button>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {(["flutter", "wechat", "harmony"] as CodegenTarget[]).map((target) => (
          <button key={target} type="button" disabled={!!loadingTarget || !!activeRun} onClick={() => handleGenerate(target)}
            className={`rounded-lg px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50 ${target === "flutter" ? "bg-violet-700 text-white" : target === "wechat" ? "border border-violet-600 text-violet-800" : "border border-emerald-700 text-emerald-900"}`}>
            {loadingTarget === target ? "提交中…" : activeRun?.target === target ? `${TARGET_LABEL[target]} 生成中…` : `生成 ${TARGET_LABEL[target]} ZIP（同步）`}
          </button>
        ))}
        <button type="button" disabled={!!loadingTarget || !!activeRun} onClick={() => {
          const targets: CodegenTarget[] = ["flutter", "wechat", "harmony"];
          setSyncProgress("并行生成三平台代码（各约 10–30 秒）…");
          fetch(`/api/projects/${projectId}/codegen/generate-all`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ targets }) })
            .then(r => r.json()).then(d => {
              if (d.ok) showSuccess("三栈并行生成完成");
              else setError(d.errors?.map((e: { target: string; error: string }) => `${e.target}: ${e.error}`).join(" · ") ?? "并行生成失败");
            }).catch(e => setError(e.message))
            .finally(() => { setSyncProgress(null); void fetchRuns(); });
        }} className="rounded-lg bg-gradient-to-r from-violet-700 to-emerald-700 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50">
          {loadingTarget ? "生成中…" : "一键三栈生成（并行）"}
        </button>
        <button type="button" disabled={false} onClick={() => void fetchRuns().catch(() => {})} className="rounded-lg border border-violet-300 px-3 py-2 text-xs text-violet-800">刷新记录</button>
        {failedRunCount > 0 ? (
          <label className="flex cursor-pointer items-center gap-1.5 text-xs text-violet-800">
            <input type="checkbox" checked={hideFailedRuns} onChange={(e) => setHideFailedRuns(e.target.checked)} className="rounded border-violet-300" />
            折叠失败记录（{failedRunCount}）
          </label>
        ) : null}
      </div>

      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      {activeRun && <p className="mt-2 text-xs text-violet-900">当前任务：{TARGET_LABEL[activeRun.target]} · 约每 3 秒自动刷新</p>}
      {runs.length > 0 && visibleRuns.length === 0 && hideFailedRuns ? <p className="mt-3 text-xs text-violet-700">已折叠 {failedRunCount} 条。 <button type="button" className="font-medium text-violet-900 underline" onClick={() => setHideFailedRuns(false)}>展开查看</button></p> : null}

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
                <CodegenRunRow key={run.id} run={run} onGenerate={handleGenerate} onPush={handlePush} onCancel={handleCancel}
                  loadingTarget={loadingTarget} activeRun={activeRun} pushingRunId={pushingRunId} cancelingRunId={cancelingRunId}
                  copiedRepoRunId={copiedRepoRunId} onCopyRepo={handleCopyRepo} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
