/**
 * 同步验收微信小程序 codegen
 * npm run verify:codegen:wechat -- <projectId>
 */
import "../lib/load-env-local";

import { artifactExists } from "../lib/codegen/artifacts";
import { executeWechatCodegen } from "../lib/codegen/execute-wechat";
import { createCodegenRun, getCodegenRun } from "../lib/codegen/runs";

async function main() {
  const projectId = process.argv[2]?.trim();
  if (!projectId) {
    console.error("用法: npm run verify:codegen:wechat -- <projectId>");
    process.exit(1);
  }

  console.log("══ 同步微信小程序 codegen 验收 ══\n");
  console.log(`项目: ${projectId}\n`);

  const run = await createCodegenRun({ projectId, target: "wechat" });
  const result = await executeWechatCodegen({
    projectId,
    runId: run.id
  });

  const row = await getCodegenRun(run.id);
  const meta = (row?.metadata ?? {}) as {
    previewPath?: string;
    buildStatus?: string;
  };

  const hasArtifact =
    !!row?.artifact_path && (await artifactExists(row.artifact_path));
  const hasPreview =
    !!meta.previewPath && (await artifactExists(meta.previewPath));

  console.log(`runId: ${run.id}`);
  console.log(`status: ${row?.status}`);
  console.log(`spec_source: ${result.spec_source}`);
  console.log(`buildStatus: ${meta.buildStatus ?? result.build.status}`);
  console.log(`artifact: ${row?.artifact_path}`);
  console.log(`preview: ${meta.previewPath ?? "—"}`);
  console.log(`file: ${result.fileName}`);

  const ok = row?.status === "completed" && hasArtifact && hasPreview;

  if (!ok) {
    console.error("\n❌ 验收失败");
    if (row?.log) console.error(row.log);
    process.exit(1);
  }

  console.log("\n✅ verify:codegen:wechat 通过");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
