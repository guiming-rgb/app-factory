"use client";

export function DownloadHarmonyButton({ projectId }: { projectId: string }) {
  return (
    <button
      type="button"
      onClick={() => {
        window.open(`/api/projects/${projectId}/export-harmony`, "_blank");
      }}
      className="rounded-lg border border-emerald-700 px-4 py-2 text-sm font-medium text-emerald-900 hover:bg-emerald-50"
    >
      快速下载鸿蒙（同步）
    </button>
  );
}
