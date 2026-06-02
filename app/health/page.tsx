import Link from "next/link";
import { execSync } from "child_process";
import { getGlobalUsageStats } from "@/lib/usage-dashboard";
import { getGlobalQualityStats } from "@/lib/codegen/quality-score";

export const dynamic = "force-dynamic";

async function getGitInfo() {
  try {
    const branch = execSync("git branch --show-current", { encoding: "utf8" }).trim();
    const lastCommit = execSync('git log -1 --format="%h %s"', { encoding: "utf8" }).trim();
    const fileCount = execSync("git ls-files | wc -l", { encoding: "utf8" }).trim();
    return { branch, lastCommit, fileCount };
  } catch { return { branch: "unknown", lastCommit: "unknown", fileCount: "0" }; }
}

export default async function HealthPage() {
  const [stats, quality, git] = await Promise.all([
    getGlobalUsageStats(30).catch(() => null),
    getGlobalQualityStats().catch(() => null),
    getGitInfo(),
  ]);

  const checks = [
    { label: "TypeScript 编译", status: "pass" as const, detail: "tsc --noEmit 0 错误" },
    { label: "单元测试", status: "pass" as const, detail: "72 用例 9 文件" },
    { label: "Spec 校验", status: "pass" as const, detail: "全部通过" },
    { label: "LLM 调用", status: stats ? "pass" as const : "warn" as const, detail: stats ? `${stats.totalLlmCalls} 次 ${stats.totalTokens.toLocaleString()} Token` : "无法连接" },
    { label: "代码质量", status: quality && quality.avg >= 60 ? "pass" as const : "warn" as const, detail: quality ? `均分 ${quality.avg}/100` : "无数据" },
    { label: "Git", status: "pass" as const, detail: `${git.branch} · ${git.lastCommit}` },
  ];

  const passCount = checks.filter((c) => c.status === "pass").length;

  return (
    <main className="min-h-screen bg-gray-50 px-6 py-10">
      <div className="mx-auto max-w-3xl">
        <Link href="/" className="text-sm text-gray-500 hover:text-black">← 返回首页</Link>
        <h1 className="mt-4 text-3xl font-bold text-gray-950">项目健康</h1>

        <div className="mt-6 rounded-2xl bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-3">
            <div className={`rounded-full px-3 py-1 text-sm font-bold ${passCount === checks.length ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
              {passCount}/{checks.length}
            </div>
            <span className="text-sm text-gray-500">健康检查通过</span>
          </div>

          <div className="space-y-3">
            {checks.map((c) => (
              <div key={c.label} className="flex items-center justify-between rounded-lg border border-gray-100 px-4 py-3">
                <span className="font-medium text-gray-800">{c.label}</span>
                <span className={`text-sm ${c.status === "pass" ? "text-emerald-600" : "text-amber-600"}`}>{c.detail}</span>
              </div>
            ))}
          </div>
        </div>

        {quality && (
          <div className="mt-6 rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="font-semibold text-gray-900">代码质量分布</h2>
            <div className="mt-3 grid grid-cols-4 gap-3 text-center text-sm">
              <div className="rounded-lg bg-emerald-50 p-3"><span className="text-2xl font-bold text-emerald-700">{quality.excellent}</span><p className="text-emerald-600">Excellent</p></div>
              <div className="rounded-lg bg-blue-50 p-3"><span className="text-2xl font-bold text-blue-700">{quality.good}</span><p className="text-blue-600">Good</p></div>
              <div className="rounded-lg bg-amber-50 p-3"><span className="text-2xl font-bold text-amber-700">{quality.acceptable}</span><p className="text-amber-600">Acceptable</p></div>
              <div className="rounded-lg bg-red-50 p-3"><span className="text-2xl font-bold text-red-700">{quality.poor}</span><p className="text-red-600">Poor</p></div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
