"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function RegenerateCompletedButton({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleRegenerate() {
    const ok = window.confirm(
      "将删除当前报告与各 Agent 输出并重新跑完整流水线，确定要重新生成吗？"
    );
    if (!ok) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/projects/${projectId}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ forceRegenerate: true })
      });

      const data = await res.json();

      if (!res.ok) {
        const msg =
          typeof data?.error === "string"
            ? data.error
            : typeof data?.message === "string"
              ? data.message
              : "重新生成失败";
        throw new Error(msg);
      }

      router.refresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "重新生成失败";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        type="button"
        onClick={handleRegenerate}
        disabled={loading}
        className="rounded-xl border border-amber-600 bg-amber-50 px-5 py-3 text-sm font-medium text-amber-900 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? "任务已提交..." : "重新生成报告"}
      </button>
      {error && (
        <p className="max-w-xs text-right text-xs text-red-600">{error}</p>
      )}
    </div>
  );
}
