/**
 * v5-6 多 Agent 记忆注入静态检查
 * npm run verify:v5:multi-agent-memories
 */
import fs from "fs";
import path from "path";

const root = process.cwd();

function main() {
  console.log("══ v5-6 多 Agent 记忆注入检查 ══\n");

  const bindings = fs.readFileSync(
    path.join(root, "lib/agents/memory-bindings.ts"),
    "utf8"
  );
  const workflow = fs.readFileSync(
    path.join(root, "lib/workflow.ts"),
    "utf8"
  );

  for (const code of [
    "ceo",
    "product_manager",
    "architect",
    "qa_lead"
  ]) {
    if (!bindings.includes(`"${code}"`)) {
      console.error(`❌ memory-bindings 缺少 Agent: ${code}`);
      process.exit(1);
    }
    console.log(`✓ memory-bindings 含 ${code}`);
  }

  for (const token of [
    "agentReceivesProjectMemories",
    "memorySectionHintForAgent",
    "listProjectMemoriesForWorkflow",
    "formatMemoriesForPrompt"
  ]) {
    if (!workflow.includes(token)) {
      console.error(`❌ workflow 缺少: ${token}`);
      process.exit(1);
    }
    console.log(`✓ workflow 含 ${token}`);
  }

  if (workflow.includes('agent.code === "ceo"')) {
    console.error("❌ workflow 仍仅 CEO 注入记忆（应使用 memory-bindings）");
    process.exit(1);
  }
  console.log("✓ workflow 已改为 memory-bindings 驱动");

  console.log("\n✅ v5-6 多 Agent 记忆注入已接线");
}

main();
