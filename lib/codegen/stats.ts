import { getSupabaseAdmin } from "@/lib/supabase";

/**
 * 收尾 3: 生成代码统计（行数/组件数/趋势）
 */

export type CodeStats = {
  runId: string;
  target: string;
  totalFiles: number;
  dartWidgets: number;
  wxmlLines: number;
  etsComponents: number;
  sqlTables: number;
  totalLines: number;
  createdAt: string;
};

export async function collectCodeStats(runId: string): Promise<Partial<CodeStats> | null> {
  try {
    const { data: run } = await getSupabaseAdmin()
      .from("codegen_runs")
      .select("id, target, metadata, artifact_path, created_at")
      .eq("id", runId)
      .maybeSingle();

    if (!run) return null;
    const meta = (run.metadata ?? {}) as Record<string, unknown>;

    // 从已有 metadata 提取统计
    const stats: Partial<CodeStats> = {
      runId: run.id as string,
      target: run.target as string,
      totalFiles: (meta.fileCount as number) ?? 0,
      sqlTables: (meta.tableNames instanceof Array ? meta.tableNames.length : 0),
      totalLines: 0,
      createdAt: run.created_at as string,
    };

    // 尝试从 artifact 获取更详细统计
    const { readArtifactFile } = await import("@/lib/codegen/artifacts");
    const { artifactExists } = await import("@/lib/codegen/artifacts");

    if (run.artifact_path && await artifactExists(run.artifact_path as string)) {
      const AdmZip = (await import("adm-zip")).default;
      const buffer = await readArtifactFile(run.artifact_path as string);
      const zip = new AdmZip(buffer);

      let totalLines = 0, dartWidgets = 0, wxmlLines = 0, etsComponents = 0;
      for (const entry of zip.getEntries()) {
        if (entry.isDirectory) continue;
        const name = entry.entryName;
        const content = entry.getData().toString("utf8").slice(0, 50000);
        const lines = content.split("\n").length;
        totalLines += lines;

        if (name.endsWith(".dart")) dartWidgets += (content.match(/class\s+\w+\s+extends\s+(Stateless|Stateful)Widget/g) ?? []).length;
        if (name.endsWith(".wxml")) wxmlLines += lines;
        if (name.endsWith(".ets")) etsComponents += (content.match(/@Component/g) ?? []).length;
      }

      stats.totalFiles = zip.getEntries().length;
      stats.totalLines = totalLines;
      stats.dartWidgets = dartWidgets;
      stats.wxmlLines = wxmlLines;
      stats.etsComponents = etsComponents;
    }

    return stats;
  } catch {
    return null;
  }
}

export async function getCodeStatsHistory(): Promise<Array<{ date: string; avgLines: number; avgFiles: number; count: number }>> {
  const { data } = await getSupabaseAdmin()
    .from("codegen_runs")
    .select("metadata, created_at")
    .eq("status", "completed")
    .order("created_at", { ascending: false })
    .limit(200);

  const byDate = new Map<string, { totalLines: number; totalFiles: number; count: number }>();
  for (const run of (data ?? [])) {
    const date = (run.created_at as string).slice(0, 10);
    const meta = (run.metadata ?? {}) as Record<string, unknown>;
    const lines = typeof meta.totalLines === "number" ? meta.totalLines : typeof meta.fileCount === "number" ? meta.fileCount * 50 : 0;
    const files = (meta.fileCount as number) ?? 0;
    const entry = byDate.get(date) ?? { totalLines: 0, totalFiles: 0, count: 0 };
    entry.totalLines += lines;
    entry.totalFiles += files;
    entry.count++;
    byDate.set(date, entry);
  }

  return [...byDate.entries()]
    .map(([date, e]) => ({ date, avgLines: Math.round(e.totalLines / e.count), avgFiles: Math.round(e.totalFiles / e.count), count: e.count }))
    .sort((a, b) => a.date.localeCompare(b.date));
}
