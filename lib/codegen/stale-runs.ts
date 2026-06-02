import { getSupabaseAdmin } from "@/lib/supabase";

import { markCodegenRunFailed } from "./runs";

/** queued 长时间未消费（与 CodegenPanel「排队超过 90 秒」提示一致） */
export const CODEGEN_QUEUED_STALE_MS = 90 * 1000;

/** running 执行超时（10 分钟，同步 codegen 通常 10-30 秒） */
export const CODEGEN_RUNNING_STALE_MS = 10 * 60 * 1000;

/** @deprecated 使用 QUEUED/RUNNING 分项阈值 */
export const CODEGEN_STALE_RUN_MAX_AGE_MS = CODEGEN_RUNNING_STALE_MS;

const STALE_QUEUED_LOG =
  "stale queued cleanup: 排队超时未消费（Inngest 未启动或端口不一致），已自动标记 failed";

const STALE_RUNNING_LOG =
  "stale running cleanup: 生成超时未结束，已自动标记 failed";

async function cleanupByStatus(options: {
  projectId?: string;
  status: "queued" | "running";
  maxAgeMs: number;
  log: string;
}): Promise<string[]> {
  const cutoff = new Date(Date.now() - options.maxAgeMs).toISOString();

  let query = getSupabaseAdmin()
    .from("codegen_runs")
    .select("id")
    .eq("status", options.status)
    .lt("created_at", cutoff);

  if (options.projectId) {
    query = query.eq("project_id", options.projectId);
  }

  const { data, error } = await query;
  if (error) {
    console.warn("[cleanupStaleCodegenRuns]", error.message);
    return [];
  }

  const cleaned: string[] = [];
  for (const row of data ?? []) {
    await markCodegenRunFailed(String(row.id), options.log);
    cleaned.push(String(row.id));
  }
  return cleaned;
}

export async function cleanupStaleCodegenRuns(options?: {
  projectId?: string;
  maxAgeMs?: number;
}): Promise<{ cleaned: string[] }> {
  const queuedMs = options?.maxAgeMs ?? CODEGEN_QUEUED_STALE_MS;
  const runningMs = CODEGEN_RUNNING_STALE_MS;

  const queued = await cleanupByStatus({
    projectId: options?.projectId,
    status: "queued",
    maxAgeMs: queuedMs,
    log: STALE_QUEUED_LOG
  });
  const running = await cleanupByStatus({
    projectId: options?.projectId,
    status: "running",
    maxAgeMs: runningMs,
    log: STALE_RUNNING_LOG
  });

  return { cleaned: [...queued, ...running] };
}
