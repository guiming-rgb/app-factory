"use client";

export function DownloadWechatButton({ projectId }: { projectId: string }) {
  return (
    <button
      type="button"
      className="rounded-lg border border-emerald-600 px-4 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-50"
      onClick={() => {
        window.open(`/api/projects/${projectId}/export-wechat`, "_blank");
      }}
    >
      下载微信小程序（ZIP）
    </button>
  );
}
