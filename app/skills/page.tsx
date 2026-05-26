import Link from "next/link";

import { AuthHeader } from "@/components/AuthHeader";
import { SkillsAdminPanel } from "@/components/SkillsAdminPanel";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function SkillsManagePage() {
  return (
    <main className="min-h-screen bg-gray-50 px-6 py-10">
      <div className="mx-auto max-w-4xl">
        <div className="mb-4">
          <AuthHeader />
        </div>
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-gray-950">技能管理</h1>
            <p className="mt-1 text-sm text-gray-500">
              v5-8 · 草稿 → 发布；已发布技能供 Agent skill_ids 绑定
            </p>
          </div>
          <div className="flex gap-2 text-sm">
            <Link
              href="/projects"
              className="rounded-xl border border-gray-300 px-4 py-2 text-gray-800 hover:bg-white"
            >
              历史项目
            </Link>
            <Link
              href="/"
              className="rounded-xl bg-black px-4 py-2 text-white hover:opacity-90"
            >
              首页
            </Link>
          </div>
        </div>
        <SkillsAdminPanel />
      </div>
    </main>
  );
}
