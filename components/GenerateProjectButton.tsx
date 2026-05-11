"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function GenerateProjectButton({
  projectId,
  confirmMessage
}: {
  projectId: string;
  /** 若提供，点击时先弹出浏览器 confirm */
  confirmMessage?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleGenerate() {
    if (confirmMessage && !window.confirm(confirmMessage)) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/projects/${projectId}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({})
      });

      const data = await res.json();

      if (!res.ok) {
        const msg =
          typeof data?.error === "string"
            ? data.error
            : typeof data?.message === "string"
              ? data.message
              : "AI 生产失败";
        throw new Error(msg);
      }

      router.refresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "AI 生产失败";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        type="button"
        onClick={handleGenerate}
        disabled={loading}
        className="rounded-xl bg-black px-5 py-3 text-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? "AI 生产中，请等待..." : "开始 AI 生产"}
      </button>

      {error && (
        <p className="max-w-xs text-right text-xs text-red-600">{error}</p>
      )}
    </div>
  );
}
