/**
 * P3: 纯 SVG 柱状图组件
 * 不引入第三方图表库，轻量自绘
 */

type BarData = {
  label: string;
  value: number;
};

export function UsageChart({
  data,
  height = 160,
  color = "#7c3aed"
}: {
  data: BarData[];
  height?: number;
  color?: string;
}) {
  if (!data.length) {
    return (
      <div className="flex items-center justify-center text-xs text-gray-400" style={{ height }}>
        暂无数据
      </div>
    );
  }

  const maxValue = Math.max(...data.map((d) => d.value), 1);
  const barWidth = Math.max(8, Math.min(24, Math.floor((data.length > 0 ? 320 / data.length : 40))));
  const chartWidth = data.length * (barWidth + 4) + 40;
  const chartHeight = height;
  const paddingTop = 10;
  const paddingBottom = 24;
  const barAreaHeight = chartHeight - paddingTop - paddingBottom;

  return (
    <svg
      width="100%"
      viewBox={`0 0 ${Math.max(chartWidth, 200)} ${chartHeight}`}
      className="overflow-visible"
    >
      {/* Y 轴标签 */}
      <text x="4" y={paddingTop + 6} className="fill-gray-400 text-[9px]" fontSize="9">
        {formatNumber(maxValue)}
      </text>
      <text x="4" y={paddingTop + barAreaHeight / 2 + 4} className="fill-gray-400 text-[9px]" fontSize="9">
        {formatNumber(Math.round(maxValue / 2))}
      </text>
      <text x="4" y={chartHeight - paddingBottom + 4} className="fill-gray-400 text-[9px]" fontSize="9">
        0
      </text>

      {/* 柱状图 */}
      {data.map((d, i) => {
        const barH = Math.max(2, (d.value / maxValue) * barAreaHeight);
        const x = 28 + i * (barWidth + 4);
        const y = paddingTop + barAreaHeight - barH;
        return (
          <g key={i}>
            <rect
              x={x}
              y={y}
              width={barWidth}
              height={barH}
              rx="2"
              fill={color}
              opacity="0.85"
            >
              <title>
                {d.label}: {d.value.toLocaleString()}
              </title>
            </rect>
            {/* X 轴标签 */}
            <text
              x={x + barWidth / 2}
              y={chartHeight - 4}
              textAnchor="end"
              transform={`rotate(-35, ${x + barWidth / 2}, ${chartHeight - 8})`}
              className="fill-gray-500 text-[8px]"
              fontSize="8"
            >
              {d.label.length > 6 ? d.label.slice(0, 5) + "…" : d.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}
