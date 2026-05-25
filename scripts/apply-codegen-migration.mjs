/**
 * 用直连 Postgres 执行 codegen_runs 迁移 + 刷新 PostgREST 缓存
 * 维护者一次性：在 .env.local 增加 DATABASE_URL（Supabase → Database → Connection string → URI）
 *
 * npm run db:apply:codegen
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
    console.error("❌ .env.local 缺少 DATABASE_URL（postgres 连接串）");
    console.error("");
    console.error("一次性配置（约 1 分钟）：");
    console.error("  1. 打开 https://supabase.com/dashboard/project/dllaezdyxmoebkkwbftd");
    console.error("  2. 左侧 Settings → Database");
    console.error("  3. Connection string → 选 URI → 复制（把 [YOUR-PASSWORD] 换成数据库密码）");
    console.error("  4. 写入 .env.local 一行：DATABASE_URL=postgresql://...");
    console.error("  5. 再让 Agent 执行：npm run db:apply:codegen");
    console.error("");
    console.error("或改用手动：SQL Editor 跑 sql/migrations/20260520_codegen_runs.sql + API Reload schema");
    process.exit(1);
  }

  const host = dbUrl.replace(/^postgres(ql)?:\/\//, "").split("@")[1]?.split("/")[0];
  console.log(`══ 应用 codegen_runs 迁移 ══`);
  console.log(`数据库主机: ${host ?? "(已隐藏)"}\n`);

  const sqlFile = path.join(root, "sql/migrations/20260520_codegen_runs.sql");
  if (!fs.existsSync(sqlFile)) {
    console.error("❌ 找不到迁移文件:", sqlFile);
    process.exit(1);
  }

  const psql = spawnSync("psql", [dbUrl, "-v", "ON_ERROR_STOP=1", "-f", sqlFile], {
    stdio: "inherit",
    encoding: "utf8"
  });
  if (psql.status !== 0) {
    console.error("\n❌ psql 执行迁移失败（未安装 psql 或密码/网络错误）");
    process.exit(psql.status ?? 1);
  }

  const notify = spawnSync(
    "psql",
    [dbUrl, "-v", "ON_ERROR_STOP=1", "-c", "NOTIFY pgrst, 'reload schema';"],
    { stdio: "inherit", encoding: "utf8" }
  );
  if (notify.status !== 0) {
    console.warn("\n⚠️ NOTIFY pgrst 失败；请在 Dashboard → Settings → API → Reload schema");
  } else {
    console.log("\n✓ 已 NOTIFY pgrst reload schema");
  }

  console.log("\n✅ 迁移已应用。请执行：npm run check:codegen:table");
}

main();
