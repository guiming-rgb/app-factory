import { buildSpecForProject } from "@/lib/app-spec/from-report";
import { validateAppSpec } from "@/lib/app-spec/validate";
import { generateWechatZip } from "@/lib/wechat-codegen/generate";
import { writeArtifactFile } from "@/lib/codegen/artifacts";
import {
  markCodegenRunCompleted,
  markCodegenRunFailed,
  markCodegenRunRunning
} from "@/lib/codegen/runs";
import { getSupabaseAdmin } from "@/lib/supabase";

export type WechatCodegenExecuteResult = {
  runId: string;
  fileName: string;
  artifact_path: string;
  spec_source: string;
  displayName: string;
};

export async function executeWechatCodegen(input: {
  projectId: string;
  runId: string;
}): Promise<WechatCodegenExecuteResult> {
  const { projectId, runId } = input;

  await markCodegenRunRunning(runId);

  const { data: project, error } = await getSupabaseAdmin()
    .from("projects")
    .select("id, title, idea, final_report, status")
    .eq("id", projectId)
    .single();

  if (error || !project) {
    const msg = "项目不存在";
    await markCodegenRunFailed(runId, msg);
    throw new Error(msg);
  }

  try {
    const built = await buildSpecForProject({
      id: project.id,
      title: project.title ?? "未命名",
      idea: project.idea,
      final_report: project.final_report
    });

    const validation = validateAppSpec(built.spec);
    if (!validation.ok) {
      const msg = `App Spec 校验失败：${validation.errors.join("; ")}`;
      await markCodegenRunFailed(runId, msg);
      throw new Error(msg);
    }

    const { buffer, fileName, displayName } = await generateWechatZip(
      validation.spec
    );
    const artifact_path = await writeArtifactFile(runId, fileName, buffer);

    await markCodegenRunCompleted(runId, {
      artifact_path,
      spec_source: built.source,
      metadata: {
        fileName,
        displayName,
        ...(built.warning ? { specWarning: built.warning.slice(0, 500) } : {})
      }
    });

    return {
      runId,
      fileName,
      artifact_path,
      spec_source: built.source,
      displayName
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "微信小程序 codegen 失败";
    await markCodegenRunFailed(runId, message).catch(() => {});
    throw err;
  }
}
