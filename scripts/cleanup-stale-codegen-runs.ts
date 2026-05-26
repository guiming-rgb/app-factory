/**
 * 将超时的 queued/running codegen_runs 标为 failed
 * npm run cleanup:codegen:stale [-- projectId]
 */
import "../lib/load-env-local";

const projectId = process.argv[2]?.trim() || undefined;

async function main() {
  const { cleanupStaleCodegenRuns } = await import("../lib/codegen/stale-runs");
  const { cleaned } = await cleanupStaleCodegenRuns({ projectId });
  if (!cleaned.length) {
    console.log("✅ 无超时 queued/running 记录");
    return;
  }
  console.log(`✅ 已清理 ${cleaned.length} 条：`);
  for (const id of cleaned) {
    console.log(`   - ${id}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
