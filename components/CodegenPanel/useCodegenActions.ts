"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CodegenRun } from "@/components/hooks/useCodegenRuns";
import { classifyCodegenFailure } from "@/lib/codegen/format-run-quality";

const SPEC_QUALITY_WARN = 60;
type CodegenTarget = "flutter" | "wechat" | "harmony";
type SpecQualityPreview = { score: number; warnings: string[] };

export const TARGET_LABEL: Record<string, string> = { flutter: "Flutter", wechat: "微信小程序", harmony: "鸿蒙 ArkTS" };

export function useCodegenActions(projectId: string) {
  const [loadingTarget, setLoadingTarget] = useState<CodegenTarget | null>(null);
  const [pushingRunId, setPushingRunId] = useState<string | null>(null);
  const [pushingAll, setPushingAll] = useState(false);
  const [cancelingRunId, setCancelingRunId] = useState<string | null>(null);
  const [copiedRepoRunId, setCopiedRepoRunId] = useState<string | null>(null);
  const [specQuality, setSpecQuality] = useState<SpecQualityPreview | null>(null);
  const [syncProgress, setSyncProgress] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  async function handleGenerate(
    target: CodegenTarget,
    fetchSingleRun: (id: string) => Promise<CodegenRun>,
    fetchRuns: () => Promise<unknown>,
    startPolling: (id: string) => void,
    setError: (msg: string) => void
  ) {
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

  async function handlePush(runId: string, fetchRuns: () => Promise<unknown>, setError: (msg: string) => void) {
    setPushingRunId(runId); setError("");
    try {
      const res = await fetch(`/api/projects/${projectId}/codegen/runs/${runId}/github-push`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.code === "github_not_connected" ? "请先连接 GitHub" : data?.error ?? "推送失败");
      await fetchRuns();
    } catch (err: unknown) { setError(err instanceof Error ? err.message : "推送失败"); }
    finally { setPushingRunId(null); }
  }

  async function handleCancel(runId: string, fetchRuns: () => Promise<unknown>, setError: (msg: string) => void) {
    setCancelingRunId(runId); setError("");
    try {
      const res = await fetch(`/api/projects/${projectId}/codegen/runs/${runId}/cancel`, { method: "POST" });
      if (!res.ok) throw new Error((await res.json())?.error ?? "取消失败");
      await fetchRuns();
    } catch (err: unknown) { setError(err instanceof Error ? err.message : "取消失败"); }
    finally { setCancelingRunId(null); }
  }

  async function handlePushAll(fetchRuns: () => Promise<unknown>, setError: (msg: string) => void) {
    setPushingAll(true); setError("");
    try {
      const res = await fetch(`/api/projects/${projectId}/codegen/github-push-all`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ensure: true }) });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data?.errors?.length ? data.errors.map((e: { target: string; error: string }) => `${e.target}: ${e.error}`).join(" · ") : data?.error ?? "三栈 push 失败");
      await fetchRuns();
    } catch (err: unknown) { setError(err instanceof Error ? err.message : "三栈 push 失败"); }
    finally { setPushingAll(false); }
  }

  async function handleCopyRepo(runId: string, url: string, setError: (msg: string) => void) {
    try { await navigator.clipboard.writeText(url); setCopiedRepoRunId(runId); setTimeout(() => setCopiedRepoRunId(null), 2000); }
    catch { setError("复制失败"); }
  }

  async function handleGenerateAll(
    targets: CodegenTarget[],
    fetchRuns: () => Promise<unknown>,
    setError: (msg: string) => void
  ) {
    setSyncProgress("并行生成三平台代码（各约 10–30 秒）…");
    return fetch(`/api/projects/${projectId}/codegen/generate-all`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ targets }) })
      .then(r => r.json()).then(d => {
        if (d.ok) showSuccess("三栈并行生成完成");
        else setError(d.errors?.map((e: { target: string; error: string }) => `${e.target}: ${e.error}`).join(" · ") ?? "并行生成失败");
      }).catch(e => setError(e.message))
      .finally(() => { setSyncProgress(null); void fetchRuns(); });
  }

  return {
    loadingTarget, pushingRunId, pushingAll, cancelingRunId, copiedRepoRunId,
    specQuality, syncProgress, successMsg,
    showSuccess,
    handleGenerate, handlePush, handleCancel, handlePushAll, handleCopyRepo, handleGenerateAll
  };
}
