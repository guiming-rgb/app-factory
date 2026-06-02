/**
 * P3: 用量仪表盘摘要卡片
 */

type SummaryCardsProps = {
  totalProjects: number;
  totalLlmCalls: number;
  totalTokens: number;
  avgTokensPerCall: number;
};

export function UsageSummaryCards({
  totalProjects,
  totalLlmCalls,
  totalTokens,
  avgTokensPerCall
}: SummaryCardsProps) {
  const cards = [
    {
      label: "总项目数",
      value: totalProjects.toLocaleString(),
      color: "border-violet-300 bg-violet-50"
    },
    {
      label: "LLM 调用次数",
      value: totalLlmCalls.toLocaleString(),
      color: "border-blue-300 bg-blue-50"
    },
    {
      label: "总 Token 消耗",
      value: formatTokens(totalTokens),
      color: "border-emerald-300 bg-emerald-50"
    },
    {
      label: "平均 Token/次",
      value: totalLlmCalls > 0 ? Math.round(avgTokensPerCall).toLocaleString() : "—",
      color: "border-amber-300 bg-amber-50"
    }
  ];

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className={`rounded-xl border ${card.color} px-4 py-3`}
        >
          <p className="text-[11px] text-gray-600">{card.label}</p>
          <p className="mt-1 text-lg font-bold text-gray-900">{card.value}</p>
        </div>
      ))}
    </div>
  );
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}
