import type { CodegenRunRow, CodegenTarget } from "@/lib/codegen/runs";
import {
  createCodegenRun,
  getCodegenRun,
  listCodegenRuns
} from "@/lib/codegen/runs";

const TARGETS: CodegenTarget[] = ["flutter", "wechat", "harmony"];

function latestCompleted(
  runs: CodegenRunRow[],
  target: CodegenTarget
): CodegenRunRow | undefined {
  return runs.find(
    (r) =>
      r.target === target &&
      r.status === "completed" &&
      !!r.artifact_path?.trim()
  );
}

async function executeCodegen(
  target: CodegenTarget,
  projectId: string,
  runId: string
): Promise<void> {
  if (target === "flutter") {
    const { executeFlutterCodegen } = await import("@/lib/codegen/execute-flutter");
    await executeFlutterCodegen({ projectId, runId });
    return;
  }
  if (target === "wechat") {
    const { executeWechatCodegen } = await import("@/lib/codegen/execute-wechat");
    await executeWechatCodegen({ projectId, runId });
    return;
  }
  const { executeHarmonyCodegen } = await import("@/lib/codegen/execute-harmony");
  await executeHarmonyCodegen({ projectId, runId });
}

/** 确保某 target 存在 completed run（无则同步执行 codegen） */
export async function ensureCompletedCodegenRun(input: {
  projectId: string;
  target: CodegenTarget;
}): Promise<CodegenRunRow> {
  const runs = await listCodegenRuns(input.projectId, 30);
  const existing = latestCompleted(runs, input.target);
  if (existing) return existing;

  const run = await createCodegenRun({
    projectId: input.projectId,
    target: input.target
  });
  await executeCodegen(input.target, input.projectId, run.id);
  const done = await getCodegenRun(run.id);
  if (!done || done.status !== "completed" || !done.artifact_path) {
    throw new Error(
      `${input.target} codegen 未 completed：${done?.log ?? done?.status ?? "unknown"}`
    );
  }
  return done;
}

export async function findLatestCompletedRuns(
  projectId: string
): Promise<Partial<Record<CodegenTarget, CodegenRunRow>>> {
  const runs = await listCodegenRuns(projectId, 40);
  const out: Partial<Record<CodegenTarget, CodegenRunRow>> = {};
  for (const target of TARGETS) {
    const row = latestCompleted(runs, target);
    if (row) out[target] = row;
  }
  return out;
}

export { TARGETS as CODEGEN_PUSH_TARGETS };
