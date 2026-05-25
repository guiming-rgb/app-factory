/**
 * 应用 v4 限流表迁移
 * npm run db:apply:v4-rate-limit
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
  if (!dbUrl || !dbUrl.startsWith("postgres")) {
    console.error("❌ .env.local 缺少 DATABASE_URL");
    console.error("或手动在 Supabase SQL Editor 执行 sql/migrations/20260527_v4_rate_limits.sql");
    process.exit(1);
  }

  const sqlFile = path.join(root, "sql/migrations/20260527_v4_rate_limits.sql");
  console.log("══ 应用 v4 限流表迁移 ══\n");

  const psql = spawnSync("psql", [dbUrl, "-v", "ON_ERROR_STOP=1", "-f", sqlFile], {
    stdio: "inherit",
    encoding: "utf8"
  });
  if (psql.status !== 0) {
    console.error("\n❌ psql 执行失败");
    process.exit(psql.status ?? 1);
  }

  console.log("\n✅ 迁移已应用。请执行：npm run check:v4:rate-limit");
}

main();
