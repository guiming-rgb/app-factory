import Link from "next/link";

import { getGlobalUsageStats } from "@/lib/usage-dashboard";
import { getGlobalQualityStats } from "@/lib/codegen/quality-score";
import { UsageChart } from "@/components/UsageChart";
import { UsageSummaryCards } from "@/components/UsageSummaryCards";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/** Agent code → 中文名映射 */
const AGENT_NAMES: Record<string, string> = {
  ceo: "CEO 总策划",
  product_manager: "产品经理",
  project_manager: "项目经理",
  architect: "系统架构师",
  ui_designer: "UI/UX 设计师",
  dev_lead: "开发负责人",
  qa_lead: "测试负责人",
  business_advisor: "商业顾问"
};

export default async function DashboardPage() {
  const stats = await getGlobalUsageStats(30);

  if (!stats) {
    return (
      <main className="min-h-screen bg-gray-50 px-6 py-10">
        <div className="mx-auto max-w-5xl">
          <Link href="/" className="text-sm text-gray-500 hover:text-black">
            ← 返回首页
          </Link>
          <p className="mt-6 text-gray-600">无法加载用量统计，请确认 usage_logs 表已迁移。</p>
        </div>
      </main>
    );
  }

  const avgTokensPerCall =
    stats.totalLlmCalls > 0
      ? Math.round(stats.totalTokens / stats.totalLlmCalls)
      : 0;

  const trendData = stats.dailyTrends.map((d) => ({
    label: d.date.slice(5), // MM-DD
    value: d.totalTokens
  }));

  const agentData = stats.byAgent.map((a) => ({
    label: a.agentCode,
    value: a.totalTokens
  }));

  return (
    <main className="min-h-screen bg-gray-50 px-6 py-10">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex flex-wrap items-center gap-4">
          <Link href="/" className="text-sm text-gray-500 hover:text-black">
            ← 返回首页
          </Link>
          <Link
            href="/projects"
            className="text-sm text-gray-500 hover:text-black"
          >
            历史项目
          </Link>
        </div>

        <h1 className="mb-8 text-3xl font-bold text-gray-950">用量仪表盘</h1>

        {/* 摘要卡片 */}
        <UsageSummaryCards
          totalProjects={stats.totalProjects}
          totalLlmCalls={stats.totalLlmCalls}
          totalTokens={stats.totalTokens}
          avgTokensPerCall={avgTokensPerCall}
        />

        {/* 趋势图 */}
        <div className="mt-8 rounded-2xl border border-gray-200 bg-white p-6">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            近 30 天 Token 消耗趋势
          </h2>
          <UsageChart data={trendData} height={180} color="#7c3aed" />
        </div>

        <div className="mt-8 grid gap-8 md:grid-cols-2">
          {/* Agent 分布 */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">
              按 Agent 分布
            </h2>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100 text-left text-gray-500">
                  <th className="py-2 pr-2 font-medium">Agent</th>
                  <th className="py-2 pr-2 font-medium">调用次数</th>
                  <th className="py-2 pr-2 font-medium">Token 合计</th>
                  <th className="py-2 font-medium">平均耗时</th>
                </tr>
              </thead>
              <tbody>
                {stats.byAgent.map((a) => (
                  <tr key={a.agentCode} className="border-b border-gray-50">
                    <td className="py-2 pr-2 text-gray-800">
                      {AGENT_NAMES[a.agentCode] ?? a.agentCode}
                    </td>
                    <td className="py-2 pr-2 text-gray-600">{a.count}</td>
                    <td className="py-2 pr-2 text-gray-800">
                      {a.totalTokens.toLocaleString()}
                    </td>
                    <td className="py-2 text-gray-500">
                      {formatMs(a.avgDurationMs)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {stats.byAgent.length > 0 && (
              <div className="mt-4">
                <UsageChart
                  data={agentData}
                  height={120}
                  color="#8b5cf6"
                />
              </div>
            )}
          </div>

          {/* Top 项目 */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">
              Top 10 项目（按 Token）
            </h2>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100 text-left text-gray-500">
                  <th className="py-2 pr-2 font-medium">项目</th>
                  <th className="py-2 pr-2 font-medium">调用次数</th>
                  <th className="py-2 font-medium">Token</th>
                </tr>
              </thead>
              <tbody>
                {stats.byProject.map((p) => (
                  <tr key={p.projectId} className="border-b border-gray-50">
                    <td className="py-2 pr-2">
                      <Link
                        href={`/projects/${p.projectId}`}
                        className="text-violet-700 hover:underline"
                      >
                        {p.title.length > 20
                          ? p.title.slice(0, 19) + "…"
                          : p.title}
                      </Link>
                    </td>
                    <td className="py-2 pr-2 text-gray-600">{p.callCount}</td>
                    <td className="py-2 text-gray-800">
                      {p.totalTokens.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 模型分布 */}
        <div className="mt-8 rounded-2xl border border-gray-200 bg-white p-6">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            模型使用分布
          </h2>
          {stats.modelDistribution.length > 0 ? (
            <div className="flex flex-wrap gap-3">
              {stats.modelDistribution.map((m) => (
                <div
                  key={m.modelName}
                  className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 text-xs"
                >
                  <span className="font-medium text-gray-800">{m.modelName}</span>
                  <span className="ml-2 text-gray-500">
                    {m.count} 次 · {m.totalTokens.toLocaleString()} Token
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-400">暂无数据</p>
          )}
        </div>

        {/* P2: codegen 失败原因分布 */}
        {stats.codegenFailures.length > 0 ? (
          <div className="mt-8 rounded-2xl border border-gray-200 bg-white p-6">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Codegen 失败原因分布</h2>
            <div className="space-y-2">
              {stats.codegenFailures.map((f) => (
                <div key={f.category} className="flex items-center gap-3">
                  <span className="w-20 text-xs text-gray-600">{f.category}</span>
                  <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-red-400 rounded-full transition-all" style={{ width: `${f.percentage}%` }} />
                  </div>
                  <span className="w-16 text-xs text-right text-gray-800">{f.count} 次 ({f.percentage}%)</span>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
}

function formatMs(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rs = s % 60;
  return rs > 0 ? `${m}m${rs}s` : `${m}m`;
}
