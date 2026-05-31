import { executeFlutterCodegen } from "@/lib/codegen/execute-flutter";
import {
  createCodegenRun,
  getCodegenRun,
  type CodegenRunRow
} from "@/lib/codegen/runs";

/** Flutter 同步生成（与小程序/鸿蒙一致，避免 Inngest 排队） */
export async function runFlutterCodegenSync(input: {
  projectId: string;
  userId?: string;
}): Promise<CodegenRunRow> {
  const run = await createCodegenRun({
    projectId: input.projectId,
    target: "flutter"
  });

  await executeFlutterCodegen({
    projectId: input.projectId,
    runId: run.id,
    userId: input.userId
  });

  const done = await getCodegenRun(run.id);
  if (!done || done.status !== "completed" || !done.artifact_path) {
    throw new Error(done?.log ?? "Flutter 生成未完成");
  }
  return done;
}
