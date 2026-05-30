/**
 * npm run db:apply:codegen:harmony
 */
import fs from "fs";
import path from "path";

const root = process.cwd();
const sqlPath = path.join(root, "sql/migrations/20260528_codegen_harmony_target.sql");

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

async function main() {
  const env = { ...process.env, ...loadEnvLocal() };
  const sql = fs.readFileSync(sqlPath, "utf8");
  const dbUrl = env.DATABASE_URL?.trim();
  if (!dbUrl) {
    console.error("❌ 缺少 DATABASE_URL");
    process.exit(1);
  }
  const pg = (await import("pg")).default;
  const client = new pg.Client({ connectionString: dbUrl });
  await client.connect();
  try {
    await client.query(sql);
    console.log("✅ codegen_runs 已支持 target=harmony");
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error("❌", e instanceof Error ? e.message : e);
  process.exit(1);
});
