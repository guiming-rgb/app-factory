/**
 * v5-2 工作流记忆注入静态检查
 * npm run verify:v5:workflow
 */
import fs from "fs";
import path from "path";

const root = process.cwd();

function main() {
  console.log("══ v5-2 工作流记忆注入检查 ══\n");

  const workflow = fs.readFileSync(
    path.join(root, "lib/workflow.ts"),
    "utf8"
  );
  const required = [
    "listProjectMemoriesForWorkflow",
    "formatMemoriesForPrompt",
    'agent.code === "ceo"',
    "projectMemoriesBlock"
  ];
  for (const token of required) {
    if (!workflow.includes(token)) {
      console.error(`❌ lib/workflow.ts 缺少: ${token}`);
      process.exit(1);
    }
    console.log(`✓ workflow 含 ${token}`);
  }

  console.log("\n✅ v5-2 工作流记忆注入已接线");
}

main();
