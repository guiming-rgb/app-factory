"use client";

import { useCallback, useEffect, useState } from "react";

type SkillRow = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  category: string | null;
  codegen_snippets?: unknown[];
  version: string;
  status: "draft" | "published";
  updated_at: string;
};

function statusBadge(status: string) {
  if (status === "published") {
    return "bg-emerald-100 text-emerald-800";
  }
  return "bg-amber-100 text-amber-900";
}

function statusLabel(status: string) {
  return status === "published" ? "已发布" : "草稿";
}

export function SkillsAdminPanel() {
  const [skills, setSkills] = useState<SkillRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("product");
  const [submitting, setSubmitting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadSkills = useCallback(async () => {
    setError("");
    try {
      const res = await fetch("/api/skills/manage", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "加载技能失败");
      }
      setSkills(Array.isArray(data.skills) ? data.skills : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "加载技能失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSkills();
  }, [loadSkills]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/skills/manage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          name,
          description: description.trim() || undefined,
          category: category.trim() || undefined,
          status: "draft"
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "创建失败");
      }
      setCode("");
      setName("");
      setDescription("");
      await loadSkills();
    } catch (e) {
      setError(e instanceof Error ? e.message : "创建失败");
    } finally {
      setSubmitting(false);
    }
  }

  async function handlePublish(skillId: string) {
    setBusyId(skillId);
    setError("");
    try {
      const res = await fetch(`/api/skills/manage/${skillId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "publish" })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "发布失败");
      }
      await loadSkills();
    } catch (e) {
      setError(e instanceof Error ? e.message : "发布失败");
    } finally {
      setBusyId(null);
    }
  }

  async function handleUnpublish(skillId: string) {
    setBusyId(skillId);
    setError("");
    try {
      const res = await fetch(`/api/skills/manage/${skillId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "draft" })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "撤回失败");
      }
      await loadSkills();
    } catch (e) {
      setError(e instanceof Error ? e.message : "撤回失败");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-600">
        草稿技能不会出现在公开 <code className="rounded bg-gray-100 px-1">GET /api/skills</code>{" "}
        列表；发布后 Agent 可通过 skill_ids 绑定使用。
      </p>

      <form
        onSubmit={handleCreate}
        className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
      >
        <h2 className="text-sm font-semibold text-gray-900">新建草稿技能</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="block text-xs text-gray-600">
            code（小写+下划线）
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="my_skill"
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              required
            />
          </label>
          <label className="block text-xs text-gray-600">
            名称
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="技能显示名"
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              required
            />
          </label>
          <label className="block text-xs text-gray-600 sm:col-span-2">
            描述
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-xs text-gray-600">
            分类
            <input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </label>
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="mt-3 rounded-lg bg-black px-4 py-2 text-sm text-white disabled:opacity-50"
        >
          {submitting ? "创建中…" : "创建草稿"}
        </button>
      </form>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-xs text-gray-500">
              <th className="px-4 py-3 font-medium">code</th>
              <th className="px-4 py-3 font-medium">名称</th>
              <th className="px-4 py-3 font-medium">分类</th>
              <th className="px-4 py-3 font-medium">状态</th>
              <th className="px-4 py-3 font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-gray-500">
                  加载中…
                </td>
              </tr>
            ) : skills.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-gray-500">
                  暂无技能
                </td>
              </tr>
            ) : (
              skills.map((s) => (
                <tr key={s.id} className="border-b border-gray-50">
                  <td className="px-4 py-3 font-mono text-xs">{s.code}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{s.name}</div>
                    {s.description ? (
                      <div className="text-xs text-gray-500">{s.description}</div>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{s.category ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusBadge(s.status)}`}
                    >
                      {statusLabel(s.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {s.status === "draft" ? (
                      <button
                        type="button"
                        disabled={busyId === s.id}
                        onClick={() => handlePublish(s.id)}
                        className="text-sm font-medium text-emerald-700 hover:underline disabled:opacity-50"
                      >
                        {busyId === s.id ? "发布中…" : "发布"}
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={busyId === s.id}
                        onClick={() => handleUnpublish(s.id)}
                        className="text-sm font-medium text-amber-800 hover:underline disabled:opacity-50"
                      >
                        {busyId === s.id ? "处理中…" : "撤回草稿"}
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
