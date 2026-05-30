import { executeHarmonyCodegen } from "@/lib/codegen/execute-harmony";
import {
  createCodegenRun,
  getCodegenRun,
  type CodegenRunRow
} from "@/lib/codegen/runs";

/**
 * 鸿蒙生成较快且 Inngest 队列在生产环境易卡住，改为同步执行并写入 codegen_runs。
 */
export async function runHarmonyCodegenSync(input: {
  projectId: string;
}): Promise<CodegenRunRow> {
  const run = await createCodegenRun({
    projectId: input.projectId,
    target: "harmony"
  });

  await executeHarmonyCodegen({ projectId: input.projectId, runId: run.id });

  const done = await getCodegenRun(run.id);
  if (!done || done.status !== "completed" || !done.artifact_path) {
    throw new Error(done?.log ?? "鸿蒙生成未完成");
  }
  return done;
}
