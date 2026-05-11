"use client";

import { useRouter } from "next/navigation";

export function RefreshProjectButton() {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => router.refresh()}
      className="rounded-xl border border-gray-300 bg-white px-5 py-3 text-sm text-gray-800 hover:bg-gray-50"
    >
      刷新状态
    </button>
  );
}
