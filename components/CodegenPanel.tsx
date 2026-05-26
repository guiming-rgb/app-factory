"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { GitHubConnectButton } from "@/components/GitHubConnectButton";

type CodegenTarget = "flutter" | "wechat";

type CodegenRun = {
  id: string;
  target: CodegenTarget;
  status: "queued" | "running" | "completed" | "failed";
  spec_source: string | null;
  log: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  downloadUrl?: string | null;
  previewUrl?: string | null;
};

const TARGET_LABEL: Record<CodegenTarget, string> = {
  flutter: "Flutter",
  wechat: "微信小程序"
};

const STATUS_LABEL: Record<string, string> = {
  queued: "排队中",
  running: "生成中",
  completed: "已完成",
  failed: "失败"
};

function formatAnalyzeStatus(meta: Record<string, unknown>) {
  let s = "";
  const status = meta.analyzeStatus;
  if (status === "passed") s = " · analyze ✅";
  else if (status === "skipped") s = " · analyze 跳过";
  else if (status === "failed") s = " · analyze ❌";
  const buildStatus = meta.buildStatus;
  if (buildStatus === "passed") s += " · build ✅";
  else if (buildStatus === "skipped") s += " · build 跳过";
  else if (buildStatus === "failed") s += " · build ❌";
  const rounds = meta.autoFixRounds;
  if (typeof rounds === "number" && rounds > 0) {
    s += ` · 自动修 ${rounds} 轮`;
  }
  return s;
}

function formatSpecSource(source: string | null, meta: Record<string, unknown>) {
  const base = source === "report-llm"
    ? "报告→Spec（LLM）"
    : source === "title-heuristic"
      ? "标题启发式（回退）"
      : source ?? "—";
  return base + formatAnalyzeStatus(meta);
}

export function CodegenPanel({
  projectId,
  initialRuns = [],
  embedded = false
}: {
  projectId: string;
  initialRuns?: CodegenRun[];
  embedded?: boolean;
}) {
  const [runs, setRuns] = useState<CodegenRun[]>(initialRuns);
  const [loadingTarget, setLoadingTarget] = useState<CodegenTarget | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [pushingRunId, setPushingRunId] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchRuns = useCallback(async () => {
    const res = await fetch(`/api/projects/${projectId}/codegen/runs`, {
      cache: "no-store"
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.error ?? "加载 codegen 记录失败");
    }
    setRuns(data.runs ?? []);
    return data.runs as CodegenRun[];
  }, [projectId]);

  const pollRun = useCallback(
    async (runId: string) => {
      const res = await fetch(
        `/api/projects/${projectId}/codegen/runs/${runId}`,
        { cache: "no-store" }
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error ?? "查询 codegen 状态失败");
      }

      const updated = data.run as CodegenRun;
      updated.downloadUrl = data.downloadUrl ?? updated.downloadUrl ?? null;
      updated.previewUrl = data.previewUrl ?? updated.previewUrl ?? null;

      setRuns((prev) => {
        const rest = prev.filter((r) => r.id !== runId);
        return [updated, ...rest];
      });

      return updated;
    },
    [projectId]
  );

  useEffect(() => {
    void fetchRuns().catch(() => {
      /* 首屏静默；用户可点刷新或重新提交 */
    });
  }, [fetchRuns]);

  useEffect(() => {
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
      }
    };
  }, []);

  function startPolling(runId: string) {
    if (pollRef.current) {
      clearInterval(pollRef.current);
    }

    pollRef.current = setInterval(async () => {
      try {
        const run = await pollRun(runId);
        if (run.status === "completed" || run.status === "failed") {
          if (pollRef.current) {
            clearInterval(pollRef.current);
            pollRef.current = null;
          }
          await fetchRuns();
        }
      } catch {
        /* 轮询静默重试 */
      }
    }, 3000);
  }

  async function handleGenerate(target: CodegenTarget) {
    setLoadingTarget(target);
    setError("");

    try {
      const res = await fetch(
        `/api/projects/${projectId}/codegen/${target}`,
        { method: "POST" }
      );
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error ?? "启动 codegen 失败");
      }

      const runId = data.runId as string;
      await pollRun(runId);
      startPolling(runId);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "启动 codegen 失败");
    } finally {
      setLoadingTarget(null);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    setError("");
    try {
      await fetchRuns();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "刷新失败");
    } finally {
      setRefreshing(false);
    }
  }

  async function handleGitHubPush(runId: string) {
    setPushingRunId(runId);
    setError("");
    try {
      const res = await fetch(
        `/api/projects/${projectId}/codegen/runs/${runId}/github-push`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({})
        }
      );
      const data = await res.json();
      if (!res.ok) {
        if (data?.code === "github_not_connected") {
          throw new Error("请先连接 GitHub（上方「连接 GitHub」）");
        }
        throw new Error(data?.error ?? "推送到 GitHub 失败");
      }
      await fetchRuns();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "推送到 GitHub 失败");
    } finally {
      setPushingRunId(null);
    }
  }

  const activeRun = runs.find(
    (r) => r.status === "queued" || r.status === "running"
  );

  const shellClass = embedded
    ? "mt-4"
    : "mt-4 rounded-xl border border-violet-200 bg-violet-50/60 p-4";

  return (
    <div className={shellClass}>
      {!embedded && (
        <p className="text-sm font-medium text-violet-950">代码生成（后台队列）</p>
      )}
      {embedded && (
        <p className="text-sm font-medium text-violet-950">后台队列</p>
      )}
      <p className="mt-1 text-xs text-violet-800/80">
        通过 Inngest 异步生成 ZIP；产物持久化至 Supabase Storage（若已配置）。
        本地需同时运行 Inngest Dev（
        <code className="rounded bg-violet-100 px-1">npm run inngest:dev:3001</code>
        ）。
      </p>

      <div className="mt-2">
        <GitHubConnectButton nextPath={`/projects/${projectId}`} />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={!!loadingTarget || !!activeRun}
          onClick={() => handleGenerate("flutter")}
          className="rounded-lg bg-violet-700 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loadingTarget === "flutter"
            ? "提交中…"
            : activeRun?.target === "flutter"
              ? "Flutter 生成中…"
              : "后台生成 Flutter ZIP"}
        </button>

        <button
          type="button"
          disabled={!!loadingTarget || !!activeRun}
          onClick={() => handleGenerate("wechat")}
          className="rounded-lg border border-violet-600 px-4 py-2 text-sm font-medium text-violet-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loadingTarget === "wechat"
            ? "提交中…"
            : activeRun?.target === "wechat"
              ? "小程序生成中…"
              : "后台生成小程序 ZIP"}
        </button>

        <button
          type="button"
          disabled={refreshing}
          onClick={() => void handleRefresh()}
          className="rounded-lg border border-violet-300 px-3 py-2 text-xs text-violet-800 disabled:opacity-50"
        >
          {refreshing ? "刷新中…" : "刷新记录"}
        </button>
      </div>

      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

      {activeRun && (
        <p className="mt-2 text-xs text-violet-900">
          当前任务：{TARGET_LABEL[activeRun.target]} ·{" "}
          {STATUS_LABEL[activeRun.status] ?? activeRun.status}
          {activeRun.status === "queued" || activeRun.status === "running"
            ? " · 约每 3 秒自动刷新"
            : null}
        </p>
      )}

      {runs.length > 0 && (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[480px] text-left text-xs text-violet-950">
            <thead>
              <tr className="border-b border-violet-200 text-violet-700">
                <th className="py-2 pr-2 font-medium">类型</th>
                <th className="py-2 pr-2 font-medium">状态</th>
                <th className="py-2 pr-2 font-medium">Spec 来源</th>
                <th className="py-2 pr-2 font-medium">产物</th>
                <th className="py-2 font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {runs.slice(0, 8).map((run) => {
                const meta = (run.metadata ?? {}) as {
                  specWarning?: string;
                  analyzeOutput?: string;
                  analyzeReason?: string;
                  storageUploaded?: boolean;
                  storageBucket?: string;
                  githubRepoUrl?: string;
                  githubPushStatus?: string;
                };
                const hint = meta.specWarning ?? meta.analyzeOutput ?? meta.analyzeReason;
                return (
                  <tr key={run.id} className="border-b border-violet-100/80">
                    <td className="py-2 pr-2">{TARGET_LABEL[run.target]}</td>
                    <td className="py-2 pr-2">
                      {STATUS_LABEL[run.status] ?? run.status}
                    </td>
                    <td className="py-2 pr-2">
                      {formatSpecSource(run.spec_source, meta)}
                      {meta.specWarning ? (
                        <span
                          className="ml-1 cursor-help text-amber-700"
                          title={meta.specWarning}
                        >
                          ⚠
                        </span>
                      ) : null}
                    </td>
                    <td className="py-2 pr-2">
                      {run.status === "completed" && meta.storageUploaded ? (
                        <span className="text-emerald-700" title={meta.storageBucket}>
                          Storage ✅
                        </span>
                      ) : run.status === "completed" ? (
                        <span className="text-amber-700" title="仅本机 /tmp">
                          本地
                        </span>
                      ) : (
                        <span className="text-violet-400">—</span>
                      )}
                    </td>
                    <td className="py-2">
                      <div className="flex flex-wrap gap-2">
                        {run.previewUrl ? (
                          <a
                            href={run.previewUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="font-medium text-violet-700 underline"
                          >
                            预览
                          </a>
                        ) : null}
                        {run.downloadUrl ? (
                          <a
                            href={run.downloadUrl}
                            className="font-medium text-violet-700 underline"
                          >
                            下载 ZIP
                          </a>
                        ) : null}
                        {run.status === "completed" && run.downloadUrl ? (
                          <button
                            type="button"
                            disabled={pushingRunId === run.id}
                            onClick={() => void handleGitHubPush(run.id)}
                            className="font-medium text-emerald-700 underline disabled:opacity-50"
                          >
                            {pushingRunId === run.id
                              ? "推送中…"
                              : meta.githubRepoUrl
                                ? "再次推送"
                                : "推 GitHub"}
                          </button>
                        ) : null}
                        {meta.githubRepoUrl ? (
                          <a
                            href={meta.githubRepoUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="font-medium text-emerald-700 underline"
                          >
                            GitHub
                          </a>
                        ) : null}
                        {!run.downloadUrl && !run.previewUrl && run.status === "failed" && run.log ? (
                          <span className="text-red-600" title={run.log}>
                            失败
                          </span>
                        ) : null}
                        {!run.downloadUrl && !run.previewUrl && run.status !== "failed" ? (
                          <span className="text-violet-400">—</span>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
