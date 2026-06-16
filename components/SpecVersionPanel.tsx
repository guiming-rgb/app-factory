"use client";

import { useCallback, useEffect, useState } from "react";
import { computeSpecDiff, formatDiffValue, type DiffEntry } from "@/lib/spec-diff";

type VersionEntry = {
  id: string;
  version: number;
  spec: Record<string, unknown>;
  createdAt: string;
};

type DiffViewMode = "current-vs-selected" | "selected-restored";

export function SpecVersionPanel({
  projectId,
  currentSpec,
  onRestore
}: {
  projectId: string;
  currentSpec: Record<string, unknown> | null;
  onRestore?: () => void;
}) {
  const [versions, setVersions] = useState<VersionEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState(false);

  // 选中的版本 ID（用于对比）
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const [diff, setDiff] = useState<DiffEntry[] | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [restoreMsg, setRestoreMsg] = useState("");

  const fetchVersions = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/projects/${projectId}/spec/versions`, {
        cache: "no-store"
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as Record<string, unknown>).error as string ?? "获取版本历史失败");
      }
      const data = (await res.json()) as { versions: VersionEntry[] };
      setVersions(data.versions ?? []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "获取失败");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void fetchVersions();
  }, [fetchVersions]);

  // 选中一个版本进行对比
  function handleSelectVersion(versionId: string) {
    if (selectedVersionId === versionId) {
      // 取消选中
      setSelectedVersionId(null);
      setDiff(null);
      return;
    }
    setRestoreMsg("");
    setSelectedVersionId(versionId);

    const version = versions.find((v) => v.id === versionId);
    if (!version || !currentSpec) {
      setDiff(null);
      return;
    }

    const result = computeSpecDiff(currentSpec, version.spec);
    setDiff(result);
  }

  // 恢复版本
  async function handleRestore(versionId: string) {
    setRestoring(true);
    setRestoreMsg("");
    try {
      const res = await fetch(`/api/projects/${projectId}/spec/versions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ versionId })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error((data as Record<string, unknown>).error as string ?? "恢复失败");
      }
      setRestoreMsg("✅ 已恢复到此版本");
      onRestore?.();
      // 刷新版本列表（版本号会递增）
      await fetchVersions();
      // 清除选中状态
      setSelectedVersionId(null);
      setDiff(null);
    } catch (err: unknown) {
      setRestoreMsg(`❌ ${err instanceof Error ? err.message : "恢复失败"}`);
    } finally {
      setRestoring(false);
    }
  }

  // 在版本列表中找到当前选中的版本
  const selectedVersion = versions.find((v) => v.id === selectedVersionId);
  const isLatest = (v: VersionEntry) => versions.length > 0 && v.version === versions[0].version;

  // 空状态
  if (!loading && !error && versions.length === 0) {
    return null; // 没版本时完全不渲染，保持 SpecEditorPanel 简洁
  }

  return (
    <div className="mb-3 rounded-lg border border-slate-200 bg-white/90">
      {/* 面板头 */}
      <button
        type="button"
        onClick={() => {
          setExpanded(!expanded);
          if (!expanded && versions.length === 0) void fetchVersions();
        }}
        className="flex w-full items-center justify-between px-3 py-2 text-xs font-medium text-slate-900 hover:bg-slate-50/80 rounded-t-lg"
      >
        <span className="flex items-center gap-1.5">
          <span>📋 版本历史</span>
          {versions.length > 0 && (
            <span className="rounded-full bg-slate-200 px-1.5 py-0.5 text-[9px] text-slate-600">
              {versions.length}
            </span>
          )}
          {loading && <span className="text-[10px] text-slate-400">加载中…</span>}
          {error && <span className="text-[10px] text-red-500">加载失败</span>}
        </span>
        <span className="text-slate-400">{expanded ? "▲" : "▼"}</span>
      </button>

      {expanded && (
        <div className="border-t border-slate-100 px-2 py-2">
          {/* 错误状态 */}
          {error && !loading && (
            <div className="rounded bg-red-50 px-2 py-1.5 text-[10px] text-red-700">
              加载失败：{error}
              <button
                type="button"
                onClick={() => void fetchVersions()}
                className="ml-2 underline"
              >
                重试
              </button>
            </div>
          )}

          {/* 加载状态 */}
          {loading && (
            <div className="flex items-center gap-2 px-1 py-3 text-[10px] text-slate-400">
              <span className="inline-block h-3 w-3 animate-spin rounded-full border border-slate-300 border-t-slate-600" />
              加载版本历史…
            </div>
          )}

          {/* 版本列表 */}
          {!loading && !error && versions.length > 0 && (
            <div className="space-y-1">
              {versions.map((v) => {
                const selected = selectedVersionId === v.id;
                const isLatestVer = isLatest(v);
                const ts = formatTimestamp(v.createdAt);

                return (
                  <div key={v.id} className="rounded">
                    <div className="flex items-center gap-1.5 px-1.5 py-1">
                      <button
                        type="button"
                        onClick={() => handleSelectVersion(v.id)}
                        className={`flex flex-1 items-center gap-2 rounded px-1.5 py-1 text-left text-[11px] transition-colors ${
                          selected
                            ? "bg-indigo-100 text-indigo-900"
                            : "hover:bg-slate-100 text-slate-700"
                        }`}
                      >
                        <span className="min-w-[2rem] font-mono font-medium text-slate-900">
                          v{v.version}
                        </span>
                        <span className="text-slate-500">{ts}</span>
                        {isLatestVer && (
                          <span className="rounded bg-emerald-100 px-1 py-0.5 text-[9px] text-emerald-700">
                            当前
                          </span>
                        )}
                      </button>

                      {!isLatestVer && (
                        <button
                          type="button"
                          onClick={() => handleRestore(v.id)}
                          disabled={restoring}
                          className="rounded border border-slate-200 px-1.5 py-0.5 text-[10px] text-slate-600 hover:bg-slate-50 disabled:opacity-40 shrink-0"
                        >
                          {restoring ? "…" : "恢复"}
                        </button>
                      )}
                    </div>

                    {/* Diff 展示（选中时） */}
                    {selected && diff !== null && (
                      <div className="mx-2 mb-1.5 rounded border border-slate-200 bg-slate-50/80 px-2 py-1.5">
                        {diff.length === 0 ? (
                          <p className="text-[10px] text-slate-500">此版本与当前 Spec 无差异</p>
                        ) : (
                          <>
                            <p className="mb-1 text-[10px] font-medium text-slate-600">
                              与当前版本差异（{diff.length} 项）
                            </p>
                            <div className="max-h-48 space-y-0.5 overflow-y-auto">
                              {diff.map((d, i) => (
                                <DiffRow key={i} diff={d} />
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    )}

                    {/* 选中但没有 diff（还没 currentSpec） */}
                    {selected && diff === null && currentSpec === null && (
                      <div className="mx-2 mb-1.5 rounded border border-slate-200 bg-slate-50/80 px-2 py-1.5">
                        <p className="text-[10px] text-slate-500">请先完成 Spec 加载</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* 恢复结果消息 */}
          {restoreMsg && (
            <p className="mt-1.5 rounded bg-slate-100 px-2 py-1 text-[10px] text-slate-700">
              {restoreMsg}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/** 单条差异渲染 */
function DiffRow({ diff }: { diff: DiffEntry }) {
  const colorClass =
    diff.type === "added"
      ? "text-emerald-700 bg-emerald-50/60"
      : diff.type === "removed"
        ? "text-red-700 bg-red-50/60"
        : "text-amber-700 bg-amber-50/60";

  const label =
    diff.type === "added" ? "新增" : diff.type === "removed" ? "删除" : "修改";

  return (
    <div className={`rounded px-1.5 py-0.5 text-[10px] ${colorClass}`}>
      <span className="font-medium">{label}</span>{" "}
      <code className="font-mono text-[9px]">{diff.path}</code>
      {diff.type === "changed" && (
        <span className="ml-1">
          <span className="line-through opacity-60">{formatDiffValue(diff.oldValue)}</span>
          <span className="mx-0.5">→</span>
          <span>{formatDiffValue(diff.newValue)}</span>
        </span>
      )}
      {diff.type === "added" && diff.newValue !== undefined && (
        <span className="ml-1">→ {formatDiffValue(diff.newValue)}</span>
      )}
      {diff.type === "removed" && diff.oldValue !== undefined && (
        <span className="ml-1">→ {formatDiffValue(diff.oldValue)}</span>
      )}
    </div>
  );
}

function formatTimestamp(iso: string): string {
  try {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch {
    return iso;
  }
}
