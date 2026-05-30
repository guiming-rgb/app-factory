import Link from "next/link";
import { AuthHeader } from "@/components/AuthHeader";
import { UserProfilePanel } from "@/components/UserProfilePanel";
import { listProjectsForPage } from "@/lib/projects-server";
import { getServerUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ProjectsListPage() {
  const user = await getServerUser();
  const projects = await listProjectsForPage(user?.id ?? null);

  return (
    <main className="min-h-screen bg-gray-50 px-6 py-10">
      <div className="mx-auto max-w-4xl">
        <div className="mb-4">
          <AuthHeader />
        </div>
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-950">历史项目</h1>
            <p className="mt-1 text-sm text-gray-500">
              {user?.email
                ? `已登录：${user.email} · 仅显示您创建的项目`
                : "查看最近创建的方案项目（最多展示 50 条）。"}
            </p>
          </div>
          <Link
            href="/"
            className="rounded-xl bg-black px-4 py-2 text-sm text-white hover:opacity-90"
          >
            新建项目
          </Link>
        </div>

        {user ? (
          <div className="mb-6">
            <UserProfilePanel />
          </div>
        ) : null}

        {projects === null ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-800">
            无法加载项目列表，请检查 Supabase 环境变量（NEXT_PUBLIC_SUPABASE_URL、SUPABASE_SERVICE_ROLE_KEY）与数据库表是否已初始化。
          </div>
        ) : projects.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center text-gray-500">
            暂无项目，请从首页创建。
          </div>
        ) : (
          <ul className="space-y-3">
            {projects.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/projects/${p.id}`}
                  className="flex flex-col gap-1 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:border-gray-400 md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <p className="font-semibold text-gray-950">{p.title}</p>
                    <p className="text-xs text-gray-500">ID：{p.id}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-700">
                      {formatListStatus(p.status)}
                    </span>
                    <span className="text-xs text-gray-400">
                      {new Date(p.updated_at).toLocaleString("zh-CN")}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}

function formatListStatus(status: string) {
  const map: Record<string, string> = {
    pending: "等待生产",
    running: "生产中",
    completed: "已完成",
    failed: "失败"
  };
  return map[status] || status;
}
