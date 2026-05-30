/**
 * npm run db:apply:v5-user-profiles
 */
import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";

const root = process.cwd();
const sqlPath = path.join(
  root,
  "sql/migrations/20260528_v5_user_profiles.sql"
);

function loadEnvLocal() {
  const envPath = path.join(root, ".env.local");
  if (!fs.existsSync(envPath)) return {};
  const out = {};
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i <= 0) continue;
    out[t.slice(0, i).trim()] = t.slice(i + 1).trim();
  }
  return out;
}

async function applyPg(url, sql) {
  const pg = (await import("pg")).default;
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  try {
    await client.query(sql);
  } finally {
    await client.end();
  }
}

async function main() {
  const env = { ...process.env, ...loadEnvLocal() };
  const sql = fs.readFileSync(sqlPath, "utf8");
  const dbUrl = env.DATABASE_URL?.trim();

  console.log("══ V5-10 user_profiles 迁移 ══\n");

  const psql = spawnSync(
    "psql",
    [dbUrl, "-v", "ON_ERROR_STOP=1", "-f", sqlPath],
    { encoding: "utf8" }
  );
  if (psql.status === 0) {
    console.log("✅ 迁移已应用（psql）");
    return;
  }

  if (!dbUrl) {
    console.error("❌ 缺少 DATABASE_URL");
    process.exit(1);
  }

  console.log("psql 不可用，改用 node pg…\n");
  await applyPg(dbUrl, sql);
  console.log("✅ 迁移已应用（pg）");
}

main().catch((e) => {
  console.error("❌", e instanceof Error ? e.message : e);
  process.exit(1);
});
