import { getCodegenRun, updateCodegenRun } from "@/lib/codegen/runs";

export async function mergeCodegenRunMetadata(
  runId: string,
  patch: Record<string, unknown>
): Promise<void> {
  const run = await getCodegenRun(runId);
  if (!run) {
    throw new Error(`codegen run 不存在：${runId}`);
  }
  const prev = (run.metadata ?? {}) as Record<string, unknown>;
  await updateCodegenRun(runId, {
    metadata: { ...prev, ...patch }
  });
}

export async function mergeCodegenRunNestedMetadata(
  runId: string,
  key: string,
  patch: Record<string, unknown>
): Promise<void> {
  const run = await getCodegenRun(runId);
  if (!run) {
    throw new Error(`codegen run 不存在：${runId}`);
  }
  const prev = (run.metadata ?? {}) as Record<string, unknown>;
  const nested = (prev[key] ?? {}) as Record<string, unknown>;
  await updateCodegenRun(runId, {
    metadata: { ...prev, [key]: { ...nested, ...patch } }
  });
}
