/**
 * v5-8 Skills 管理页 + draft→published API
 * npm run verify:v5:skills-admin
 */
import fs from "fs";
import path from "path";

const root = process.cwd();

function main() {
  console.log("══ v5-8 Skills 管理检查 ══\n");

  const required = [
    "lib/skills/server.ts",
    "app/api/skills/manage/route.ts",
    "app/api/skills/manage/[id]/route.ts",
    "app/skills/page.tsx",
    "components/SkillsAdminPanel.tsx"
  ];
  for (const rel of required) {
    if (!fs.existsSync(path.join(root, rel))) {
      console.error(`❌ 缺少 ${rel}`);
      process.exit(1);
    }
    console.log(`✓ ${rel}`);
  }

  const server = fs.readFileSync(path.join(root, "lib/skills/server.ts"), "utf8");
  const manageRoute = fs.readFileSync(
    path.join(root, "app/api/skills/manage/route.ts"),
    "utf8"
  );
  const manageIdRoute = fs.readFileSync(
    path.join(root, "app/api/skills/manage/[id]/route.ts"),
    "utf8"
  );
  const panel = fs.readFileSync(
    path.join(root, "components/SkillsAdminPanel.tsx"),
    "utf8"
  );

  for (const token of [
    "listAllSkillsForManage",
    "createSkillDraft",
    "publishSkill",
    "updateSkillForManage"
  ]) {
    if (!server.includes(token)) {
      console.error(`❌ server 缺少 ${token}`);
      process.exit(1);
    }
    console.log(`✓ server 含 ${token}`);
  }

  for (const token of ["GET", "POST", "listAllSkillsForManage"]) {
    if (!manageRoute.includes(token)) {
      console.error(`❌ manage route 缺少 ${token}`);
      process.exit(1);
    }
    console.log(`✓ manage route 含 ${token}`);
  }

  for (const token of ["PATCH", "publishSkill", 'action === "publish"']) {
    if (!manageIdRoute.includes(token)) {
      console.error(`❌ manage/[id] route 缺少 ${token}`);
      process.exit(1);
    }
    console.log(`✓ manage/[id] 含 ${token}`);
  }

  for (const token of ["/api/skills/manage", "发布", "草稿"]) {
    if (!panel.includes(token)) {
      console.error(`❌ SkillsAdminPanel 缺少 ${token}`);
      process.exit(1);
    }
    console.log(`✓ panel 含 ${token}`);
  }

  console.log("\n✅ v5-8 Skills 管理已接线");
}

main();
