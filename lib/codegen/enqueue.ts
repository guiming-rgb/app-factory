import { inngestUserIdFromSession } from "@/lib/auth/inngest-project-auth";
import { inngest } from "@/lib/inngest/client";
import {
  createCodegenRun,
  markCodegenRunFailed,
  type CodegenTarget
} from "@/lib/codegen/runs";

const EVENT_BY_TARGET: Record<
  CodegenTarget,
  "project/codegen.flutter.requested" | "project/codegen.wechat.requested"
> = {
  flutter: "project/codegen.flutter.requested",
  wechat: "project/codegen.wechat.requested"
};

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "codegen 任务投递失败";
}

export async function enqueueCodegenJob(input: {
  projectId: string;
  target: CodegenTarget;
  userId?: string;
}) {
  const run = await createCodegenRun({
    projectId: input.projectId,
    target: input.target
  });

  try {
    await inngest.send({
      name: EVENT_BY_TARGET[input.target],
      data: {
        projectId: input.projectId,
        runId: run.id,
        ...inngestUserIdFromSession(input.userId)
      }
    });
  } catch (eventError: unknown) {
    const message = getErrorMessage(eventError);
    await markCodegenRunFailed(
      run.id,
      `后台任务投递失败：${message}`
    );
    throw new Error(`后台任务投递失败：${message}`);
  }

  return run;
}
