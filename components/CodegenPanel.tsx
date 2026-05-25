"use client";

import { useCallback, useEffect, useRef, useState } from "react";

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

function formatSpecSource(source: string | null) {
  if (source === "report-llm") return "报告→Spec（LLM）";
  if (source === "title-heuristic") return "标题启发式（回退）";
  return source ?? "—";
}

export function CodegenPanel({
  projectId,
  initialRuns = []
}: {
  projectId: string;
  initialRuns?: CodegenRun[];
}) {
  const [runs, setRuns] = useState<CodegenRun[]>(initialRuns);
  const [loadingTarget, setLoadingTarget] = useState<CodegenTarget | null>(null);
  const [error, setError] = useState("");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchRuns = useCallback(async () => {
    const res = await fetch(`/api/projects/${projectId}/codegen/runs`);
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
        `/api/projects/${projectId}/codegen/runs/${runId}`
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error ?? "查询 codegen 状态失败");
      }

      const updated = data.run as CodegenRun;
      updated.downloadUrl = data.downloadUrl ?? null;

      setRuns((prev) => {
        const rest = prev.filter((r) => r.id !== runId);
        return [updated, ...rest];
      });

      return updated;
    },
    [projectId]
  );

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

  const activeRun = runs.find(
    (r) => r.status === "queued" || r.status === "running"
  );

  return (
    <div className="mt-4 rounded-xl border border-violet-200 bg-violet-50/60 p-4">
      <p className="text-sm font-medium text-violet-950">代码生成（后台队列）</p>
      <p className="mt-1 text-xs text-violet-800/80">
        通过 Inngest 异步生成 ZIP；产物持久化至 Supabase Storage（若已配置）。
        本地需同时运行 Inngest Dev（
        <code className="rounded bg-violet-100 px-1">npm run inngest:dev:3001</code>
        ）。
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
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
                <th className="py-2 font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {runs.slice(0, 8).map((run) => {
                const meta = (run.metadata ?? {}) as { specWarning?: string };
                return (
                  <tr key={run.id} className="border-b border-violet-100/80">
                    <td className="py-2 pr-2">{TARGET_LABEL[run.target]}</td>
                    <td className="py-2 pr-2">
                      {STATUS_LABEL[run.status] ?? run.status}
                    </td>
                    <td className="py-2 pr-2">
                      {formatSpecSource(run.spec_source)}
                      {meta.specWarning ? (
                        <span
                          className="ml-1 cursor-help text-amber-700"
                          title={meta.specWarning}
                        >
                          ⚠
                        </span>
                      ) : null}
                    </td>
                    <td className="py-2">
                      {run.downloadUrl ? (
                        <a
                          href={run.downloadUrl}
                          className="font-medium text-violet-700 underline"
                        >
                          下载 ZIP
                        </a>
                      ) : run.status === "failed" && run.log ? (
                        <span className="text-red-600" title={run.log}>
                          查看失败原因
                        </span>
                      ) : (
                        <span className="text-violet-400">—</span>
                      )}
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
