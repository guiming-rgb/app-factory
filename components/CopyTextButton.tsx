"use client";

import { useState } from "react";

export function CopyTextButton({
  text,
  label = "复制",
  copiedLabel = "已复制",
  className = "font-medium text-violet-700 underline"
}: {
  text: string;
  label?: string;
  copiedLabel?: string;
  className?: string;
}) {
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
    <button type="button" onClick={() => void handleCopy()} className={className}>
      {done ? copiedLabel : label}
    </button>
  );
}
