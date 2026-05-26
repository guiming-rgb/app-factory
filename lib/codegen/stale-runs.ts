import { getSupabaseAdmin } from "@/lib/supabase";

import { markCodegenRunFailed } from "./runs";

/** queued/running 超过此时间视为僵尸（默认 2 小时） */
export const CODEGEN_STALE_RUN_MAX_AGE_MS = 2 * 60 * 60 * 1000;

const STALE_LOG =
  "stale run cleanup: queued/running 超时未结束，已自动标记 failed";

export async function cleanupStaleCodegenRuns(options?: {
  projectId?: string;
  maxAgeMs?: number;
}): Promise<{ cleaned: string[] }> {
  const maxAgeMs = options?.maxAgeMs ?? CODEGEN_STALE_RUN_MAX_AGE_MS;
  const cutoff = new Date(Date.now() - maxAgeMs).toISOString();

  let query = getSupabaseAdmin()
    .from("codegen_runs")
    .select("id, status, updated_at, created_at")
    .in("status", ["queued", "running"])
    .lt("created_at", cutoff);

  if (options?.projectId) {
    query = query.eq("project_id", options.projectId);
  }

  const { data, error } = await query;
  if (error) {
    console.warn("[cleanupStaleCodegenRuns]", error.message);
    return { cleaned: [] };
  }

  const cleaned: string[] = [];
  for (const row of data ?? []) {
    await markCodegenRunFailed(String(row.id), STALE_LOG);
    cleaned.push(String(row.id));
  }
  return { cleaned };
}
