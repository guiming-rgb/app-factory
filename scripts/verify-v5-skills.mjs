/**
 * v5-3 Skills API 静态检查
 * npm run verify:v5:skills
 */
import fs from "fs";
import path from "path";

const root = process.cwd();

function main() {
  console.log("══ v5-3 Skills API 检查 ══\n");

  const required = [
    "lib/skills/server.ts",
    "app/api/skills/route.ts",
    "sql/migrations/20260529_v5_skills_seed.sql"
  ];
  for (const rel of required) {
    if (!fs.existsSync(path.join(root, rel))) {
      console.error(`❌ 缺少 ${rel}`);
      process.exit(1);
    }
    console.log(`✓ ${rel}`);
  }

  const server = fs.readFileSync(path.join(root, "lib/skills/server.ts"), "utf8");
  const route = fs.readFileSync(
    path.join(root, "app/api/skills/route.ts"),
    "utf8"
  );
  for (const token of ["listPublishedSkills", 'eq("status", "published")']) {
    if (!server.includes(token)) {
      console.error(`❌ lib/skills/server.ts 缺少: ${token}`);
      process.exit(1);
    }
    console.log(`✓ server 含 ${token}`);
  }
  for (const token of ["listPublishedSkills", "GET"]) {
    if (!route.includes(token)) {
      console.error(`❌ app/api/skills/route.ts 缺少: ${token}`);
      process.exit(1);
    }
    console.log(`✓ route 含 ${token}`);
  }

  console.log("\n✅ v5-3 Skills API 已接线");
}

main();
