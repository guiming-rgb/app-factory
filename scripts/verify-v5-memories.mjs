/**
 * npm run verify:v5:memories
 */
import fs from "fs";
import path from "path";

const root = process.cwd();
const required = [
  "lib/memories/server.ts",
  "app/api/projects/[id]/memories/route.ts",
  "app/api/projects/[id]/memories/[memoryId]/route.ts",
  "sql/migrations/20260528_v5_memories_write.sql"
];

function main() {
  console.log("══ v5-1 记忆 API 检查 ══\n");
  for (const rel of required) {
    const full = path.join(root, rel);
    if (!fs.existsSync(full)) {
      console.error(`❌ 缺少 ${rel}`);
      process.exit(1);
    }
    const content = fs.readFileSync(full, "utf8");
    if (
      rel.includes("memories/route.ts") &&
      !content.includes("guardProjectAccess")
    ) {
      console.error(`❌ ${rel} 未接入 guardProjectAccess`);
      process.exit(1);
    }
    console.log(`✓ ${rel}`);
  }
  console.log("\n✅ v5-1 记忆 API 文件就绪");
}

main();
