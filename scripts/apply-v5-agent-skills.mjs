/**
 * npm run db:apply:v5-agent-skills
 */
import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";

const root = process.cwd();
const envPath = path.join(root, ".env.local");

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
    console.error("❌ 缺少 DATABASE_URL");
    process.exit(1);
  }
  const sqlFile = path.join(root, "sql/migrations/20260530_v5_agent_skill_ids.sql");
  const psqlBins = [
    "/opt/homebrew/opt/libpq/bin/psql",
    "/usr/local/opt/libpq/bin/psql",
    "psql"
  ];
  const psql = psqlBins.find((bin) => bin === "psql" || fs.existsSync(bin)) ?? "psql";
  const r = spawnSync(psql, [dbUrl, "-v", "ON_ERROR_STOP=1", "-f", sqlFile], {
    stdio: "inherit"
  });
  if (r.status !== 0) process.exit(r.status ?? 1);
  console.log("\n✅ v5 agent skill_ids 已应用");
}

main();
