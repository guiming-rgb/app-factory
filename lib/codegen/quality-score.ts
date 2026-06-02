import { getSupabaseAdmin } from "@/lib/supabase";

/**
 * 方向 A-1：代码生成品质自动评分
 * 综合 analyze 结果、编译状态、Spec 匹配度等多维度
 */

export type CodegenQualityScore = {
  total: number;
  specQuality: number;
  analyzeResult: number;
  buildResult: number;
  fileCount: number;
  storageStatus: number;
  level: "excellent" | "good" | "acceptable" | "poor";
  details: string[];
};

/** 计算单次 codegen 产物的品质评分（0-100） */
export function scoreCodegenOutput(metadata: Record<string, unknown>): CodegenQualityScore {
  const details: string[] = [];

  // 1. Spec 质量分（已有，直接取）
  const specQuality = (typeof metadata.specQualityScore === "number" ? metadata.specQualityScore : 0) * 0.35;
  details.push(`Spec 质量: ${Math.round(specQuality)}/35`);

  // 2. Analyze 结果（30 分）
  let analyzeResult = 0;
  if (metadata.analyzeStatus === "passed") { analyzeResult = 30; details.push("analyze ✅ +30"); }
  else if (metadata.analyzeStatus === "skipped") { analyzeResult = 15; details.push("analyze 跳过 +15"); }
  else { details.push("analyze ❌ +0"); }

  // 3. 构建结果（15 分）
  let buildResult = 0;
  if (metadata.buildStatus === "passed") { buildResult = 15; details.push("build ✅ +15"); }
  else if (metadata.buildStatus === "skipped") { buildResult = 8; details.push("build 跳过 +8"); }
  else { details.push("build ❌ +0"); }

  // 4. 文件产出（10 分）
  const screenCount = typeof metadata.screenCount === "number" ? metadata.screenCount : 0;
  let fileCount = 0;
  if (screenCount >= 5) { fileCount = 10; details.push(`文件产出 ${screenCount}屏 +10`); }
  else if (screenCount >= 3) { fileCount = 6; details.push(`文件产出 ${screenCount}屏 +6`); }
  else { fileCount = 3; details.push(`文件产出 ${screenCount}屏 +3`); }

  // 5. Storage 上传状态（10 分）
  let storageStatus = 0;
  if (metadata.storageUploaded === true) { storageStatus = 10; details.push("Storage ✅ +10"); }
  else { details.push("Storage 未上传 +0"); }

  const total = Math.round(specQuality + analyzeResult + buildResult + fileCount + storageStatus);

  let level: CodegenQualityScore["level"] = "poor";
  if (total >= 85) level = "excellent";
  else if (total >= 65) level = "good";
  else if (total >= 45) level = "acceptable";

  return { total, specQuality: Math.round(specQuality), analyzeResult, buildResult, fileCount, storageStatus, level, details };
}

/** 获取项目质量趋势 */
export async function getQualityTrend(projectId: string): Promise<Array<{ runId: string; target: string; score: number; createdAt: string }>> {
  const { data } = await getSupabaseAdmin()
    .from("codegen_runs")
    .select("id, target, metadata, created_at")
    .eq("project_id", projectId)
    .eq("status", "completed")
    .order("created_at", { ascending: false })
    .limit(15);

  return (data ?? []).map((r: Record<string, unknown>) => ({
    runId: r.id as string,
    target: r.target as string,
    score: scoreCodegenOutput((r.metadata ?? {}) as Record<string, unknown>).total,
    createdAt: r.created_at as string,
  }));
}

/** 全局质量统计 */
export async function getGlobalQualityStats(): Promise<{ avg: number; excellent: number; good: number; acceptable: number; poor: number; total: number }> {
  const { data } = await getSupabaseAdmin()
    .from("codegen_runs")
    .select("metadata")
    .eq("status", "completed")
    .limit(500);

  let sum = 0, excellent = 0, good = 0, acceptable = 0, poor = 0;
  for (const r of (data ?? [])) {
    const score = scoreCodegenOutput((r.metadata ?? {}) as Record<string, unknown>);
    sum += score.total;
    if (score.level === "excellent") excellent++;
    else if (score.level === "good") good++;
    else if (score.level === "acceptable") acceptable++;
    else poor++;
  }
  const total = (data ?? []).length;
  return { avg: total > 0 ? Math.round(sum / total) : 0, excellent, good, acceptable, poor, total };
}
