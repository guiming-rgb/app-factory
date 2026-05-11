"use client";

export function DownloadReportButton({ projectId }: { projectId: string }) {
  function handleDownload() {
    window.open(`/api/projects/${projectId}/export`, "_blank");
  }

  return (
    <button
      type="button"
      onClick={handleDownload}
      className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm text-gray-800 hover:bg-gray-50"
    >
      下载 Markdown
    </button>
  );
}
