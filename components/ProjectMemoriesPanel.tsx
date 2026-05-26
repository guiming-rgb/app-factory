"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

type ProjectMemory = {
  id: string;
  memory_type: string;
  content: string;
  importance: number;
  created_at: string;
};

const MEMORY_TYPES = [
  { value: "note", label: "备注" },
  { value: "constraint", label: "约束" },
  { value: "feedback", label: "反馈" }
] as const;

export function ProjectMemoriesPanel({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [memories, setMemories] = useState<ProjectMemory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [content, setContent] = useState("");
  const [memoryType, setMemoryType] = useState("note");
  const [importance, setImportance] = useState(3);
  const [submitting, setSubmitting] = useState(false);

  const loadMemories = useCallback(async () => {
    setError("");
    try {
      const res = await fetch(`/api/projects/${projectId}/memories`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "加载记忆失败");
      }
      setMemories(Array.isArray(data.memories) ? data.memories : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "加载记忆失败");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void loadMemories();
  }, [loadMemories]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const text = content.trim();
    if (!text) {
      setError("请输入记忆内容");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(`/api/projects/${projectId}/memories`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: text,
          memory_type: memoryType,
          importance
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "添加失败");
      }
      setContent("");
      await loadMemories();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "添加失败");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(memoryId: string) {
    if (!window.confirm("确定删除这条记忆？")) {
      return;
    }
    setError("");
    try {
      const res = await fetch(
        `/api/projects/${projectId}/memories/${memoryId}`,
        { method: "DELETE" }
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "删除失败");
      }
      await loadMemories();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "删除失败");
    }
  }

  return (
    <div className="mt-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-900">项目记忆</h2>
      <p className="mt-1 text-xs text-gray-600">
        补充偏好、约束或迭代反馈；下次生成时 CEO 会读取最近记忆。
      </p>

      <form onSubmit={handleAdd} className="mt-4 space-y-3">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="例如：目标用户是 25～35 岁上班族；第一版不做社交功能…"
          rows={3}
          className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-400"
        />
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-gray-600">
            类型
            <select
              value={memoryType}
              onChange={(e) => setMemoryType(e.target.value)}
              className="rounded-lg border border-gray-200 px-2 py-1 text-sm"
            >
              {MEMORY_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 text-xs text-gray-600">
            重要度
            <select
              value={importance}
              onChange={(e) => setImportance(Number(e.target.value))}
              className="rounded-lg border border-gray-200 px-2 py-1 text-sm"
            >
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-xl bg-black px-4 py-2 text-sm text-white disabled:opacity-50"
          >
            {submitting ? "保存中…" : "添加记忆"}
          </button>
        </div>
      </form>

      {error && (
        <p className="mt-3 text-xs text-red-600">{error}</p>
      )}

      <div className="mt-4 space-y-2">
        {loading ? (
          <p className="text-sm text-gray-500">加载中…</p>
        ) : memories.length === 0 ? (
          <p className="rounded-xl border border-dashed border-gray-200 px-4 py-6 text-center text-sm text-gray-500">
            暂无记忆，可在上方添加。
          </p>
        ) : (
          memories.map((m) => (
            <div
              key={m.id}
              className="flex items-start justify-between gap-3 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3"
            >
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex flex-wrap gap-2 text-xs text-gray-500">
                  <span className="rounded bg-white px-2 py-0.5">{m.memory_type}</span>
                  <span>重要度 {m.importance}</span>
                </div>
                <p className="whitespace-pre-wrap text-sm text-gray-800">
                  {m.content}
                </p>
              </div>
              <button
                type="button"
                onClick={() => void handleDelete(m.id)}
                className="shrink-0 text-xs text-red-600 hover:text-red-800"
              >
                删除
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
