/**
 * v5-5 项目记忆 UI 检查
 * npm run verify:v5:memories-ui
 */
import fs from "fs";
import path from "path";

const root = process.cwd();

function main() {
  console.log("══ v5-5 项目记忆 UI 检查 ══\n");

  const panelPath = path.join(root, "components/ProjectMemoriesPanel.tsx");
  const pagePath = path.join(root, "app/projects/[id]/page.tsx");

  if (!fs.existsSync(panelPath)) {
    console.error("❌ 缺少 components/ProjectMemoriesPanel.tsx");
    process.exit(1);
  }
  console.log("✓ components/ProjectMemoriesPanel.tsx");

  const panel = fs.readFileSync(panelPath, "utf8");
  for (const token of ["/memories", "method: \"POST\"", "method: \"DELETE\""]) {
    if (!panel.includes(token)) {
      console.error(`❌ ProjectMemoriesPanel 缺少: ${token}`);
      process.exit(1);
    }
    console.log(`✓ panel 含 ${token}`);
  }

  const page = fs.readFileSync(pagePath, "utf8");
  if (!page.includes("ProjectMemoriesPanel")) {
    console.error("❌ 项目详情页未挂载 ProjectMemoriesPanel");
    process.exit(1);
  }
  console.log("✓ page 已挂载 ProjectMemoriesPanel");

  console.log("\n✅ v5-5 项目记忆 UI 已接线");
}

main();
