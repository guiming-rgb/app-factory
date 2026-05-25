"use client";

export function DownloadFlutterButton({ projectId }: { projectId: string }) {
  return (
    <button
      type="button"
      className="rounded-lg border border-teal-600 px-4 py-2 text-sm font-medium text-teal-700 hover:bg-teal-50"
      onClick={() => {
        window.open(`/api/projects/${projectId}/export-flutter`, "_blank");
      }}
    >
      快速下载 Flutter（同步）
    </button>
  );
}
