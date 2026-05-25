/** npm run poll:codegen -- <runId> */
import "../lib/load-env-local";
import { getCodegenRun } from "../lib/codegen/runs";

async function main() {
  const runId = process.argv[2]?.trim();
  if (!runId) {
    console.error("用法: npm run poll:codegen -- <runId>");
    process.exit(1);
  }
  for (let i = 1; i <= 48; i++) {
    const r = await getCodegenRun(runId);
    console.log(`poll ${i}: ${r?.status ?? "?"}`);
    if (r?.status === "completed" || r?.status === "failed") {
      console.log(JSON.stringify(r, null, 2));
      process.exit(r.status === "completed" ? 0 : 1);
    }
    await new Promise((x) => setTimeout(x, 5000));
  }
  process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
