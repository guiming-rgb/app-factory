"use client";

import { useCallback, useEffect, useState } from "react";

type UserProfile = {
  display_name: string | null;
  role_hint: string | null;
  summary: string | null;
};

export function UserProfilePanel() {
  const [enabled, setEnabled] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [roleHint, setRoleHint] = useState("");
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/user/profile", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "加载失败");
      setEnabled(Boolean(data.enabled));
      const p = data.profile as UserProfile | null;
      setDisplayName(p?.display_name ?? "");
      setRoleHint(p?.role_hint ?? "");
      setSummary(p?.summary ?? "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (!enabled) return null;
  if (loading) {
    return (
      <p className="text-xs text-gray-500">加载用户画像…</p>
    );
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName,
          roleHint,
          summary
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "保存失败");
      setMessage("已保存 · 下次生成时 CEO/PM 会读取");
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
      <p className="text-sm font-medium text-slate-900">用户画像（V5-10 · 跨项目）</p>
      <p className="mt-1 text-xs text-slate-600">
        全局偏好会注入 CEO / 产品经理，影响所有新项目的方案生成。
      </p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <label className="text-xs text-slate-700">
          称呼
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
            placeholder="如：独立开发者小明"
          />
        </label>
        <label className="text-xs text-slate-700">
          角色
          <input
            value={roleHint}
            onChange={(e) => setRoleHint(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
            placeholder="indie / pm / teacher"
          />
        </label>
      </div>
      <label className="mt-2 block text-xs text-slate-700">
        全局偏好摘要
        <textarea
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          rows={3}
          className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
          placeholder="例：偏好单机、不做联网；目标用户是 6-12 岁儿童；首版 MVP 必须两周内可演示"
        />
      </label>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={saving}
          onClick={() => void handleSave()}
          className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
        >
          {saving ? "保存中…" : "保存画像"}
        </button>
        {message ? <span className="text-xs text-emerald-700">{message}</span> : null}
        {error ? <span className="text-xs text-red-600">{error}</span> : null}
      </div>
    </div>
  );
}
