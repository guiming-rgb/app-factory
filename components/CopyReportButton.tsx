"use client";

import { useState } from "react";

export function CopyReportButton({ text }: { text: string }) {
  const [done, setDone] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setDone(true);
      window.setTimeout(() => setDone(false), 2000);
    } catch {
      setDone(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm text-gray-800 hover:bg-gray-50"
    >
      {done ? "已复制" : "复制完整报告"}
    </button>
  );
}
