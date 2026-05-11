"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ProjectForm() {
  const router = useRouter();
  const [idea, setIdea] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit() {
    setError("");

    const cleanIdea = idea.trim();

    if (!cleanIdea) {
      setError("请先输入你的 App 想法");
      return;
    }

    if (cleanIdea.length < 10) {
      setError("请更具体地描述你的 App 想法，至少 10 个字");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ idea: cleanIdea })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "创建项目失败");
      }

      router.push(`/projects/${data.project.id}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "提交失败";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl rounded-2xl border border-gray-200 bg-white p-6 text-left shadow-sm">
      <label className="mb-3 block text-sm font-medium text-gray-700">
        输入你的 App 想法
      </label>

      <textarea
        className="min-h-44 w-full rounded-xl border border-gray-300 p-4 text-base leading-7 outline-none focus:border-black"
        placeholder="例如：我想做一个给小餐馆用的会员积分和优惠券 App，老板可以发券，顾客可以扫码领券和查看积分。"
        value={idea}
        onChange={(e) => setIdea(e.target.value)}
      />

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <div className="mt-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={loading}
          className="rounded-xl bg-black px-6 py-3 text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "创建中..." : "开始生产 App 方案"}
        </button>

        <p className="text-xs text-gray-500">
          当前版本会生成项目方案，代码生成和自动部署将在后续版本加入。
        </p>
      </div>
    </div>
  );
}
