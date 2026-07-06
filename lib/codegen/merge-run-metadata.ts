import { getSupabaseAdmin } from "@/lib/supabase";
import { getCodegenRun } from "@/lib/codegen/runs";

const MAX_MERGE_RETRIES = 5;

/**
 * v3-C6: 基于 updated_at 的乐观锁 merge，避免并发 read-modify-write 丢失更新。
 */
async function mergeCodegenRunWithLock(
  runId: string,
  mergeFn: (prev: Record<string, unknown>) => Record<string, unknown>,
): Promise<void> {
  for (let attempt = 0; attempt < MAX_MERGE_RETRIES; attempt++) {
    const run = await getCodegenRun(runId);
    if (!run) {
      throw new Error(`codegen run 不存在：${runId}`);
    }

    const prev = (run.metadata ?? {}) as Record<string, unknown>;
    const nextMetadata = mergeFn(prev);
    const expectedUpdatedAt = run.updated_at;

    const { data, error } = await getSupabaseAdmin()
      .from("codegen_runs")
      .update({
        metadata: nextMetadata,
        updated_at: new Date().toISOString(),
      })
      .eq("id", runId)
      .eq("updated_at", expectedUpdatedAt)
      .select("id")
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }
    if (data) {
      return;
    }
  }

  throw new Error(
    `metadata 乐观锁冲突重试耗尽（runId=${runId}，已重试 ${MAX_MERGE_RETRIES} 次）`,
  );
}

export async function mergeCodegenRunMetadata(
  runId: string,
  patch: Record<string, unknown>,
): Promise<void> {
  await mergeCodegenRunWithLock(runId, (prev) => ({ ...prev, ...patch }));
}

export async function mergeCodegenRunNestedMetadata(
  runId: string,
  key: string,
  patch: Record<string, unknown>,
): Promise<void> {
  await mergeCodegenRunWithLock(runId, (prev) => {
    const nested = (prev[key] ?? {}) as Record<string, unknown>;
    return { ...prev, [key]: { ...nested, ...patch } };
  });
}
