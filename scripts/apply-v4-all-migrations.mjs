/**
 * M2：一次性应用 v4 + v5 全部 DB 迁移
 * npm run db:apply:v4-all
 *
 * 需 .env.local 中 DATABASE_URL
 */
import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";

const root = process.cwd();
const envPath = path.join(root, ".env.local");

const MIGRATIONS = [
  "sql/migrations/20260526_v4_owner_id.sql",
  "sql/migrations/20260527_v4_rls.sql",
  "sql/migrations/20260527_v4_rate_limits.sql",
  "sql/migrations/20260528_v5_memories_write.sql",
  "sql/migrations/20260529_v5_skills_seed.sql",
  "sql/migrations/20260530_v5_agent_skill_ids.sql"
];

function loadEnvLocal() {
  if (!fs.existsSync(envPath)) {
    console.error("❌ 缺少 .env.local");
    process.exit(1);
  }
  const text = fs.readFileSync(envPath, "utf8");
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const i = trimmed.indexOf("=");
    if (i === -1) continue;
    const key = trimmed.slice(0, i).trim();
    let val = trimmed.slice(i + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = val;
  }
}

function main() {
  loadEnvLocal();
  const dbUrl = process.env.DATABASE_URL?.trim();
  if (!dbUrl?.startsWith("postgres")) {
    console.error("❌ .env.local 缺少 DATABASE_URL");
    console.error("Supabase → Settings → Database → Connection string (URI)");
    process.exit(1);
  }

  console.log("══ 应用 v4 + v5 全部迁移 ══\n");

  for (const rel of MIGRATIONS) {
    const sqlFile = path.join(root, rel);
    if (!fs.existsSync(sqlFile)) {
      console.error(`❌ 找不到 ${rel}`);
      process.exit(1);
    }
    console.log(`→ ${rel}`);
    const psql = spawnSync(
      "psql",
      [dbUrl, "-v", "ON_ERROR_STOP=1", "-f", sqlFile],
      { stdio: "inherit" }
    );
    if (psql.status !== 0) {
      console.error(`\n❌ 失败: ${rel}`);
      process.exit(psql.status ?? 1);
    }
  }

  console.log("\n✅ 全部迁移已应用");
  console.log("   请执行：npm run check:v4:owner && npm run check:v4:rls && npm run check:v4:rate-limit");
}

main();
