import { getSupabaseAdmin } from "@/lib/supabase";

/**
 * P3: 全局用量仪表盘 — 聚合查询
 */

export type DashboardStats = {
  totalProjects: number;
  totalLlmCalls: number;
  totalTokens: number;
  totalDurationMs: number;
  byAgent: Array<{
    agentCode: string;
    count: number;
    totalTokens: number;
    avgDurationMs: number;
  }>;
  byProject: Array<{
    projectId: string;
    title: string;
    totalTokens: number;
    callCount: number;
  }>;
  dailyTrends: Array<{
    date: string;
    totalTokens: number;
    callCount: number;
  }>;
  modelDistribution: Array<{
    modelName: string;
    count: number;
    totalTokens: number;
  }>;
  /** P2: codegen 失败原因分析 */
  codegenFailures: Array<{
    category: string;
    count: number;
    percentage: number;
  }>;
};

export async function getGlobalUsageStats(
  days = 30
): Promise<DashboardStats | null> {
  const supabase = getSupabaseAdmin();

  try {
    // 总项目数
    const { count: totalProjects } = await supabase
      .from("projects")
      .select("*", { count: "exact", head: true });

    // LLM 调用汇总
    const { data: usageRows, error: usageError } = await supabase
      .from("usage_logs")
      .select(
        "id, agent_code, duration_ms, prompt_tokens, completion_tokens, total_tokens, model_name, created_at, project_id"
      )
      .eq("event_type", "llm_call")
      .order("created_at", { ascending: false })
      .limit(5000);

    if (usageError) {
      console.warn("[getGlobalUsageStats] usage_logs:", usageError.message);
      // 返回空统计
      return {
        totalProjects: totalProjects ?? 0,
        totalLlmCalls: 0,
        totalTokens: 0,
        totalDurationMs: 0,
        byAgent: [],
        byProject: [],
        dailyTrends: [],
        modelDistribution: [],
        codegenFailures: [],
      };
    }

    const rows = (usageRows ?? []).map(
      (r: Record<string, unknown>) => ({
        agentCode: String(r.agent_code ?? ""),
        durationMs: Number(r.duration_ms ?? 0),
        totalTokens: Number(r.total_tokens ?? 0),
        modelName: String(r.model_name ?? "unknown"),
        createdAt: String(r.created_at ?? ""),
        projectId: String(r.project_id ?? "")
      })
    );

    const totalLlmCalls = rows.length;
    const totalTokens = rows.reduce((s, r) => s + r.totalTokens, 0);
    const totalDurationMs = rows.reduce((s, r) => s + r.durationMs, 0);

    // 按 Agent 汇总
    const agentMap = new Map<string, { count: number; totalTokens: number; totalDurationMs: number }>();
    const modelMap = new Map<string, { count: number; totalTokens: number }>();
    const projectMap = new Map<string, { totalTokens: number; callCount: number }>();
    const dailyMap = new Map<string, { totalTokens: number; callCount: number }>();

    for (const row of rows) {
      // Agent
      const ag = agentMap.get(row.agentCode) ?? { count: 0, totalTokens: 0, totalDurationMs: 0 };
      ag.count++;
      ag.totalTokens += row.totalTokens;
      ag.totalDurationMs += row.durationMs;
      agentMap.set(row.agentCode, ag);

      // Model
      const md = modelMap.get(row.modelName) ?? { count: 0, totalTokens: 0 };
      md.count++;
      md.totalTokens += row.totalTokens;
      modelMap.set(row.modelName, md);

      // Project
      const pj = projectMap.get(row.projectId) ?? { totalTokens: 0, callCount: 0 };
      pj.totalTokens += row.totalTokens;
      pj.callCount++;
      projectMap.set(row.projectId, pj);

      // Daily trend
      const dateStr = row.createdAt.slice(0, 10);
      const dy = dailyMap.get(dateStr) ?? { totalTokens: 0, callCount: 0 };
      dy.totalTokens += row.totalTokens;
      dy.callCount++;
      dailyMap.set(dateStr, dy);
    }

    const byAgent = [...agentMap.entries()]
      .map(([agentCode, s]) => ({
        agentCode,
        count: s.count,
        totalTokens: s.totalTokens,
        avgDurationMs: Math.round(s.totalDurationMs / s.count)
      }))
      .sort((a, b) => b.totalTokens - a.totalTokens);

    // 获取项目标题
    const projectIds = [...projectMap.keys()];
    const { data: projects } = await supabase
      .from("projects")
      .select("id, title")
      .in("id", projectIds)
      .limit(50);

    const titleById = new Map(
      (projects ?? []).map((p: { id: string; title: string }) => [p.id, p.title])
    );

    const byProject = [...projectMap.entries()]
      .map(([projectId, s]) => ({
        projectId,
        title: titleById.get(projectId) ?? "未知项目",
        totalTokens: s.totalTokens,
        callCount: s.callCount
      }))
      .sort((a, b) => b.totalTokens - a.totalTokens)
      .slice(0, 10);

    const dailyTrends = [...dailyMap.entries()]
      .map(([date, s]) => ({ date, ...s }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const modelDistribution = [...modelMap.entries()]
      .map(([modelName, s]) => ({ modelName, ...s }))
      .sort((a, b) => b.totalTokens - a.totalTokens);

    // P2: codegen 失败原因分析
    const { data: failedRuns } = await supabase
      .from("codegen_runs")
      .select("metadata, log")
      .eq("status", "failed")
      .limit(200);
    const failureCategories = new Map<string, number>();
    for (const run of (failedRuns ?? [])) {
      const meta = run.metadata as Record<string, unknown> | null;
      const log = run.log as string | null;
      // 简单分类
      let cat = "unknown";
      const text = [log, meta?.analyzeReason, meta?.buildReason, meta?.specQualityWarnings].filter((x): x is string => typeof x === "string" && !!x).join(" ").toLowerCase();
      if (text.includes("spec") || text.includes("校验")) cat = "Spec 质量";
      else if (text.includes("analyze") || text.includes("dart")) cat = "Dart Analyze";
      else if (text.includes("compile") || text.includes("wcc") || text.includes("wcsc")) cat = "编译失败";
      else if (text.includes("timeout") || text.includes("超时")) cat = "超时";
      else if (text.includes("inngest") || text.includes("队列")) cat = "Inngest 队列";
      failureCategories.set(cat, (failureCategories.get(cat) ?? 0) + 1);
    }
    const total = (failedRuns ?? []).length;
    const codegenFailures = [...failureCategories.entries()]
      .map(([category, count]) => ({ category, count, percentage: total > 0 ? Math.round((count / total) * 100) : 0 }))
      .sort((a, b) => b.count - a.count);

    return {
      totalProjects: totalProjects ?? 0,
      totalLlmCalls,
      totalTokens,
      totalDurationMs,
      byAgent,
      byProject,
      dailyTrends,
      modelDistribution,
      codegenFailures,
    };
  } catch (err) {
    console.error("[getGlobalUsageStats]", err);
    return null;
  }
}
