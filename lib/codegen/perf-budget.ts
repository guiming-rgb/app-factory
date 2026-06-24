// ============================================================
// 多平台性能预算定义
// ============================================================

export type Platform = "flutter" | "wechat" | "harmony";

export type FlutterBudget = {
  dartAnalyzeErrors: number;
  dartAnalyzeWarnings: number;
  apkSizeDebugMB: number;
  widgetBuildMs: number;
};

export type WechatBudget = {
  totalSizeKB: number;
  perPageJS_KB: number;
  wxssTotalKB: number;
  imageAssetKB: number;
};

export type HarmonyBudget = {
  etsSizeKB: number;
  maxPages: number;
  maxModules: number;
};

export const PERF_BUDGETS: Record<Platform, Record<string, number>> = {
  flutter: {
    dartAnalyzeErrors: 0,
    dartAnalyzeWarnings: 20,
    apkSizeDebugMB: 50,
    widgetBuildMs: 16,
  },
  wechat: {
    totalSizeKB: 2048,
    perPageJS_KB: 50,
    wxssTotalKB: 200,
    imageAssetKB: 100,
  },
  harmony: {
    etsSizeKB: 500,
    maxPages: 20,
    maxModules: 30,
  },
} as const;

export interface PerfMetrics {
  [metricName: string]: number;
}

/** 检查一组指标是否在预算范围内 */
export function checkBudget(
  platform: Platform,
  metrics: PerfMetrics,
): { pass: boolean; failures: string[] } {
  const budget = PERF_BUDGETS[platform];
  if (!budget) {
    return { pass: false, failures: [`未知平台: ${platform}`] };
  }

  const failures: string[] = [];
  for (const [key, limit] of Object.entries(budget)) {
    const actual = metrics[key];
    if (actual !== undefined && actual > limit) {
      failures.push(
        `${key}: ${actual} 超过预算 ${limit}${key.endsWith("MB") ? "MB" : key.endsWith("KB") ? "KB" : ""}`,
      );
    }
  }

  return { pass: failures.length === 0, failures };
}

/** 生成人类可读的预算报告 */
export function formatBudgetReport(
  platform: Platform,
  metrics: PerfMetrics,
): string {
  const budget = PERF_BUDGETS[platform];
  if (!budget) return `未知平台: ${platform}`;

  const lines: string[] = [];
  lines.push(`══ ${platform.toUpperCase()} 性能预算报告 ══`);
  lines.push("");

  let passed = 0;
  const total = Object.keys(budget).length;

  for (const [key, limit] of Object.entries(budget)) {
    const actual = metrics[key];
    if (actual === undefined) {
      lines.push(`  ? ${key}: 未检测（跳过）`);
    } else {
      const ok = actual <= limit;
      lines.push(
        `  ${ok ? "✓" : "✗"} ${key}: ${actual}（预算: ${limit}${key.endsWith("MB") ? "MB" : key.endsWith("KB") ? "KB" : ""}）`,
      );
      if (ok) passed++;
    }
  }

  const allPass = passed === total;
  lines.push("");
  lines.push(
    allPass
      ? `✅ ${passed}/${total} 项通过，性能预算达标`
      : `❌ ${passed}/${total} 项通过，${total - passed} 项超标`,
  );

  return lines.join("\n");
}
