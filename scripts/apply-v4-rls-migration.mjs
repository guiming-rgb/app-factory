/**
 * 应用 v4 RLS 迁移
 * npm run db:apply:v4-rls
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
    console.error("或手动在 Supabase SQL Editor 执行 sql/migrations/20260527_v4_rls.sql");
    process.exit(1);
  }

  const ownerSql = path.join(root, "sql/migrations/20260526_v4_owner_id.sql");
  const rlsSql = path.join(root, "sql/migrations/20260527_v4_rls.sql");

  console.log("══ 应用 v4 RLS 迁移 ══\n");
  console.log("提示：若 owner_id 列尚未添加，将先执行 owner 迁移…\n");

  const owner = spawnSync("psql", [dbUrl, "-v", "ON_ERROR_STOP=1", "-f", ownerSql], {
    stdio: "inherit",
    encoding: "utf8"
  });
  if (owner.status !== 0) {
    console.error("\n❌ owner_id 迁移失败（若列已存在可忽略并单独跑 RLS 文件）");
    process.exit(owner.status ?? 1);
  }

  const psql = spawnSync("psql", [dbUrl, "-v", "ON_ERROR_STOP=1", "-f", rlsSql], {
    stdio: "inherit",
    encoding: "utf8"
  });
  if (psql.status !== 0) {
    console.error("\n❌ RLS 迁移失败");
    process.exit(psql.status ?? 1);
  }

  console.log("\n✅ RLS 已启用。请执行：npm run check:v4:rls");
}

main();
