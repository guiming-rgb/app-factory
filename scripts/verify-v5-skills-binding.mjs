/**
 * v5-4 Agent skill_ids 绑定检查
 * npm run verify:v5:skills-binding
 */
import fs from "fs";
import path from "path";

const root = process.cwd();

function main() {
  console.log("══ v5-4 Agent skill_ids 绑定检查 ══\n");

  const required = [
    "lib/agents/skill-bindings.ts",
    "sql/migrations/20260530_v5_agent_skill_ids.sql"
  ];
  for (const rel of required) {
    if (!fs.existsSync(path.join(root, rel))) {
      console.error(`❌ 缺少 ${rel}`);
      process.exit(1);
    }
    console.log(`✓ ${rel}`);
  }

  const workflow = fs.readFileSync(path.join(root, "lib/workflow.ts"), "utf8");
  const skills = fs.readFileSync(
    path.join(root, "lib/skills/server.ts"),
    "utf8"
  );
  const tokens = [
    "loadAgentSkillBindings",
    "getPublishedSkillsByCodes",
    "formatSkillsForPrompt",
    "已绑定技能"
  ];
  for (const token of tokens) {
    const inWorkflow = workflow.includes(token);
    const inSkills = skills.includes(token);
    if (!inWorkflow && !inSkills) {
      console.error(`❌ 缺少: ${token}`);
      process.exit(1);
    }
    console.log(`✓ 含 ${token}`);
  }

  console.log("\n✅ v5-4 Agent skill_ids 绑定已接线");
}

main();
