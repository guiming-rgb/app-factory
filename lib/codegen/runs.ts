import type { SupabaseClient } from "@supabase/supabase-js";

import { getSupabaseAdmin } from "@/lib/supabase";
import type { CodegenTarget, CodegenRunStatus, CodegenRunRow } from "./types";

// Re-export types for backward compatibility
export type { CodegenTarget, CodegenRunStatus, CodegenRunRow };

export async function createCodegenRun(input: {
  projectId: string;
  target: CodegenTarget;
}): Promise<CodegenRunRow> {
  const { cleanupStaleCodegenRuns } = await import("@/lib/codegen/stale-runs");
  await cleanupStaleCodegenRuns({ projectId: input.projectId });

  // 幂等性检查：如果已有 queued/running 的 run，直接返回（防重复点击）
  const { data: existing } = await getSupabaseAdmin()
    .from("codegen_runs")
    .select("*")
    .eq("project_id", input.projectId)
    .eq("target", input.target)
    .in("status", ["queued", "running"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) {
    return existing as CodegenRunRow;
  }

  const { data, error } = await getSupabaseAdmin()
    .from("codegen_runs")
    .insert({
      project_id: input.projectId,
      target: input.target,
      status: "queued",
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(`创建 codegen_runs 失败：${error?.message ?? "unknown"}`);
  }
  return data as CodegenRunRow;
}

export async function getCodegenRun(
  runId: string,
): Promise<CodegenRunRow | null> {
  const { data, error } = await getSupabaseAdmin()
    .from("codegen_runs")
    .select("*")
    .eq("id", runId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data as CodegenRunRow | null) ?? null;
}

export async function listCodegenRuns(
  projectId: string,
  limit = 20,
  client?: SupabaseClient,
): Promise<CodegenRunRow[]> {
  const db = client ?? getSupabaseAdmin();
  const { data, error } = await db
    .from("codegen_runs")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data ?? []) as CodegenRunRow[];
}

export async function updateCodegenRun(
  runId: string,
  patch: Partial<{
    status: CodegenRunStatus;
    artifact_path: string | null;
    log: string | null;
    spec_source: string | null;
    metadata: Record<string, unknown>;
  }>,
  options?: { fromStatus?: CodegenRunStatus | CodegenRunStatus[] },
): Promise<void> {
  let query = getSupabaseAdmin()
    .from("codegen_runs")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", runId);

  if (options?.fromStatus) {
    const statuses = Array.isArray(options.fromStatus)
      ? options.fromStatus
      : [options.fromStatus];
    query = query.in("status", statuses);
  }

  const { data, error } = await query.select("id").maybeSingle();

  if (error) throw new Error(error.message);
  if (options?.fromStatus && !data) {
    const expected = Array.isArray(options.fromStatus)
      ? options.fromStatus.join("|")
      : options.fromStatus;
    throw new Error(`codegen run 状态转换无效（期望 from ${expected}）`);
  }
}

export async function markCodegenRunRunning(runId: string): Promise<void> {
  const existing = await getCodegenRun(runId);
  if (existing?.status === "running") {
    return;
  }
  await updateCodegenRun(runId, { status: "running" }, { fromStatus: "queued" });
}

export async function markCodegenRunCompleted(
  runId: string,
  result: {
    artifact_path: string;
    spec_source: string;
    metadata?: Record<string, unknown>;
  },
): Promise<void> {
  await updateCodegenRun(
    runId,
    {
      status: "completed",
      artifact_path: result.artifact_path,
      spec_source: result.spec_source,
      log: null,
      metadata: result.metadata,
    },
    { fromStatus: "running" },
  );
}

export async function markCodegenRunFailed(
  runId: string,
  message: string,
): Promise<void> {
  try {
    await updateCodegenRun(
      runId,
      {
        status: "failed",
        log: message.slice(0, 4000),
      },
      { fromStatus: ["queued", "running"] },
    );
  } catch (err) {
    console.warn(
      `[codegen/runs] markCodegenRunFailed skipped (runId=${runId}):`,
      err instanceof Error ? err.message : err,
    );
  }
}
