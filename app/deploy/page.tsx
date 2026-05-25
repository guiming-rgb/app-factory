"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type DeployCheck = {
  id: string;
  label: string;
  ok: boolean;
  detail: string;
};

type DeployStatus = {
  mode: "local" | "production";
  ready: boolean;
  checks: DeployCheck[];
  appUrl: string | null;
};

export default function DeployPage() {
  const [status, setStatus] = useState<DeployStatus | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/deploy/status", { cache: "no-store" })
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => setError("无法加载部署状态"));
  }, []);

  return (
    <main className="min-h-screen bg-gray-50 px-6 py-10">
      <div className="mx-auto max-w-2xl">
        <Link href="/" className="text-sm text-gray-500 hover:text-black">
          ← 返回首页
        </Link>
        <h1 className="mt-4 text-2xl font-bold text-gray-950">部署与预览状态</h1>
        <p className="mt-2 text-sm text-gray-600">
          v3 PoC：检查工厂运行环境；codegen 完成后可在项目详情打开 HTML 预览（非 Flutter Web）。
        </p>

        {error && (
          <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}

        {status && (
          <div className="mt-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">
                模式：{status.mode === "local" ? "本地联调" : "生产"}
              </span>
              <span
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  status.ready
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-amber-100 text-amber-900"
                }`}
              >
                {status.ready ? "就绪" : "待补配置"}
              </span>
            </div>

            {status.appUrl && (
              <p className="mt-3 text-sm">
                App URL：{" "}
                <a
                  href={status.appUrl}
                  className="text-violet-700 underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  {status.appUrl}
                </a>
              </p>
            )}

            <ul className="mt-4 space-y-2">
              {status.checks.map((c) => (
                <li
                  key={c.id}
                  className="flex items-start justify-between gap-4 rounded-lg bg-gray-50 px-3 py-2 text-sm"
                >
                  <span>
                    {c.ok ? "✅" : "⚠️"} {c.label}
                  </span>
                  <span className="text-right text-xs text-gray-500">{c.detail}</span>
                </li>
              ))}
            </ul>

            <p className="mt-4 text-xs text-gray-500">
              完整上云步骤见{" "}
              <code className="rounded bg-gray-100 px-1">docs/v3-部署指南.md</code>
              ；本地可运行{" "}
              <code className="rounded bg-gray-100 px-1">npm run check:deploy</code>
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
