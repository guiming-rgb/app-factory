import { executeWechatCodegen } from "@/lib/codegen/execute-wechat";
import {
  createCodegenRun,
  getCodegenRun,
  type CodegenRunRow
} from "@/lib/codegen/runs";

/**
 * 微信小程序改为同步生成（与鸿蒙一致），避免生产 Inngest 队列长期「排队中」。
 */
export async function runWechatCodegenSync(input: {
  projectId: string;
}): Promise<CodegenRunRow> {
  const run = await createCodegenRun({
    projectId: input.projectId,
    target: "wechat"
  });

  await executeWechatCodegen({ projectId: input.projectId, runId: run.id });

  const done = await getCodegenRun(run.id);
  if (!done || done.status !== "completed" || !done.artifact_path) {
    throw new Error(done?.log ?? "微信小程序生成未完成");
  }
  return done;
}
