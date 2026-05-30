"use client";

import { useCallback, useEffect, useState } from "react";

type GitHubStatus = {
  enabled: boolean;
  configured: boolean;
  oauthConfigured?: boolean;
  patConfigured?: boolean;
  connected: boolean;
  githubLogin?: string;
};

export function GitHubConnectButton({ nextPath }: { nextPath?: string }) {
  const [status, setStatus] = useState<GitHubStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const loadStatus = useCallback(async () => {
    setError("");
    const res = await fetch("/api/github/status", { cache: "no-store" });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.error || "读取 GitHub 状态失败");
    }
    setStatus(data as GitHubStatus);
  }, []);

  useEffect(() => {
    void loadStatus().catch((e) => {
      setError(e instanceof Error ? e.message : "读取 GitHub 状态失败");
    });
  }, [loadStatus]);

  if (!status?.configured) {
    return (
      <p className="text-xs text-gray-500">
        GitHub 推送未配置（OAuth 或维护者 GITHUB_PAT）
      </p>
    );
  }

  if (status.connected) {
    /* fall through to connected UI */
  } else if (status.patConfigured && !status.oauthConfigured) {
    return (
      <p className="text-xs text-amber-800">
        已配置 PAT 模式；首次推送前请运行{" "}
        <code className="rounded bg-amber-100 px-1">npm run bootstrap:github:pat</code>
      </p>
    );
  }

  async function handleDisconnect() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/github/disconnect", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "断开失败");
      }
      await loadStatus();
    } catch (e) {
      setError(e instanceof Error ? e.message : "断开失败");
    } finally {
      setBusy(false);
    }
  }

  const connectHref = `/api/github/oauth/start${
    nextPath ? `?next=${encodeURIComponent(nextPath)}` : ""
  }`;

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      {status.connected ? (
        <>
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-800">
            GitHub @{status.githubLogin}
          </span>
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleDisconnect()}
            className="text-gray-600 underline disabled:opacity-50"
          >
            断开
          </button>
        </>
      ) : (
        <a
          href={connectHref}
          className="rounded-full border border-gray-300 px-3 py-1 text-gray-800 hover:bg-gray-50"
        >
          连接 GitHub
        </a>
      )}
      {error ? <span className="text-red-600">{error}</span> : null}
    </div>
  );
}
