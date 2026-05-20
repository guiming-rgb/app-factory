/**
 * 同步验收 Flutter codegen（不经过 Inngest，需已执行 codegen_runs 迁移）
 * npm run verify:codegen:flutter -- <projectId>
 */
import "../lib/load-env-local";

import { artifactExists } from "../lib/codegen/artifacts";
import { executeFlutterCodegen } from "../lib/codegen/execute-flutter";
import { createCodegenRun, getCodegenRun } from "../lib/codegen/runs";

async function main() {
  const projectId = process.argv[2]?.trim();
  if (!projectId) {
    console.error("用法: npm run verify:codegen:flutter -- <projectId>");
    process.exit(1);
  }

  console.log("══ 同步 Flutter codegen 验收 ══\n");
  console.log(`项目: ${projectId}\n`);

  const run = await createCodegenRun({ projectId, target: "flutter" });
  const result = await executeFlutterCodegen({
    projectId,
    runId: run.id
  });

  const row = await getCodegenRun(run.id);
  const ok =
    row?.status === "completed" &&
    !!row.artifact_path &&
    (await artifactExists(row.artifact_path));

  console.log(`runId: ${run.id}`);
  console.log(`status: ${row?.status}`);
  console.log(`spec_source: ${result.spec_source}`);
  console.log(`artifact: ${row?.artifact_path}`);
  console.log(`file: ${result.fileName}`);

  if (!ok) {
    console.error("\n❌ 验收失败");
    if (row?.log) console.error(row.log);
    process.exit(1);
  }

  console.log("\n✅ verify:codegen:flutter 通过");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
