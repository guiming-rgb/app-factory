"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type CodegenTarget = "flutter" | "wechat" | "harmony";

export type CodegenRun = {
  id: string;
  target: CodegenTarget;
  status: "queued" | "running" | "completed" | "failed";
  spec_source: string | null;
  log: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  downloadUrl?: string | null;
  downloadMacUrl?: string | null;
  downloadMacGithubUrl?: string | null;
  downloadWinUrl?: string | null;
  sqlDownloadUrl?: string | null;
  flutterWebUrl?: string | null;
  previewUrl?: string | null;
};

const POLL_INTERVAL = 3000;
const GHA_POLL_INTERVAL = 15000;

/** Codegen 运行记录状态管理 Hook */
export function useCodegenRuns(projectId: string) {
  const [runs, setRuns] = useState<CodegenRun[]>([]);
  const [error, setError] = useState("");
  const [inngestHint, setInngestHint] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchRuns = useCallback(async () => {
    const res = await fetch(`/api/projects/${projectId}/codegen/runs`, { cache: "no-store" });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error ?? "加载 codegen 记录失败");
    setRuns(data.runs ?? []);
    const preflight = data.inngestPreflight as { ok?: boolean; message?: string; hint?: string } | undefined;
    setInngestHint(preflight && !preflight.ok ? [preflight.message, preflight.hint].filter(Boolean).join(" · ") : preflight?.hint ?? null);
    return data.runs as CodegenRun[];
  }, [projectId]);

  const fetchSingleRun = useCallback(async (runId: string) => {
    const res = await fetch(`/api/projects/${projectId}/codegen/runs/${runId}`, { cache: "no-store" });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error ?? "查询 codegen 状态失败");
    const updated = { ...data.run, downloadUrl: data.downloadUrl ?? null, downloadMacUrl: data.downloadMacUrl ?? null, downloadMacGithubUrl: data.downloadMacGithubUrl ?? null, downloadWinUrl: data.downloadWinUrl ?? null, previewUrl: data.previewUrl ?? null } as CodegenRun;
    setRuns((prev) => [updated, ...prev.filter((r) => r.id !== runId)]);
    return updated;
  }, [projectId]);

  const startPolling = useCallback((runId: string, onComplete?: (run: CodegenRun) => void) => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const run = await fetchSingleRun(runId);
        if (run.status === "completed" || run.status === "failed") {
          if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
          onComplete?.(run);
        }
      } catch { /* 静默重试 */ }
    }, POLL_INTERVAL);
  }, [fetchSingleRun]);

  // Desktop GHA polling
  useEffect(() => {
    const hasGhaPending = runs.some((r) => {
      if (r.target !== "flutter" || r.status !== "completed") return false;
      const gha = (r.metadata as Record<string, unknown> | null)?.desktopGha as { status?: string } | undefined;
      return gha?.status === "queued" || gha?.status === "running";
    });
    if (!hasGhaPending) return;
    const id = setInterval(() => { void fetchRuns().catch(() => {}); }, GHA_POLL_INTERVAL);
    return () => clearInterval(id);
  }, [runs, fetchRuns]);

  // Cleanup
  useEffect(() => {
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  return { runs, setRuns, error, setError, inngestHint, fetchRuns, fetchSingleRun, startPolling, pollRef };
}
