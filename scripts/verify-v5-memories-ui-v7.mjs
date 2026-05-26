/**
 * v5-7 记忆类型 UI 检查
 * npm run verify:v5:memories-ui-v7
 */
import fs from "fs";
import path from "path";

const root = process.cwd();

function main() {
  console.log("══ v5-7 记忆类型 UI 检查 ══\n");

  const panelPath = path.join(root, "components/ProjectMemoriesPanel.tsx");
  const panel = fs.readFileSync(panelPath, "utf8");

  for (const token of [
    'value: "constraint"',
    'value: "feedback"',
    "memoryTypeLabel",
    "memoryTypeBadgeClass",
    "importanceLabel",
    "CEO / 产品 / 架构 / QA"
  ]) {
    if (!panel.includes(token)) {
      console.error(`❌ ProjectMemoriesPanel 缺少: ${token}`);
      process.exit(1);
    }
    console.log(`✓ panel 含 ${token}`);
  }

  console.log("\n✅ v5-7 记忆类型 UI 已接线");
}

main();
