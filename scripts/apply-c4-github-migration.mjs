/**
 * npm run db:apply:c4-github
 */
import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";
import { applySqlFile } from "./apply-sql-via-pg.mjs";

const root = process.cwd();
const envPath = path.join(root, ".env.local");

function loadEnvLocal() {
  if (!fs.existsSync(envPath)) {
    console.error("❌ 缺少 .env.local");
    process.exit(1);
  }
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
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

async function main() {
  loadEnvLocal();
  const dbUrl = process.env.DATABASE_URL?.trim();
  if (!dbUrl?.startsWith("postgres")) {
    console.error("❌ 缺少 DATABASE_URL");
    process.exit(1);
  }

  const sqlPath = path.join(
    root,
    "sql/migrations/20260531_c4_github_connections.sql"
  );

  console.log("══ 应用 C4 user_github_connections 迁移 ══\n");

  const psql = spawnSync(
    "psql",
    [dbUrl, "-v", "ON_ERROR_STOP=1", "-f", sqlPath],
    { stdio: "inherit" }
  );

  if (psql.status === 0) {
    spawnSync(
      "psql",
      [dbUrl, "-v", "ON_ERROR_STOP=1", "-c", "NOTIFY pgrst, 'reload schema';"],
      { stdio: "inherit" }
    );
    console.log("\n✅ C4 迁移已应用（psql）");
    return;
  }

  console.log("psql 不可用，改用 node pg…\n");
  try {
    await applySqlFile(dbUrl, sqlPath);
    console.log("\n✅ C4 迁移已应用（pg）+ NOTIFY pgrst");
  } catch (err) {
    console.error("\n❌ 迁移失败:", err instanceof Error ? err.message : err);
    console.error("\n备选：Supabase SQL Editor 执行");
    console.error(`  ${sqlPath}`);
    process.exit(1);
  }
}

main();
