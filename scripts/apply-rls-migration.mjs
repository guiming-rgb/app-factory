#!/usr/bin/env node
/**
 * P0-2: 应用 RLS 全面覆盖迁移
 * npm run db:apply:rls-comprehensive
 */
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import pg from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

function env(key) {
  // 从调用环境读取（需要 source .env.local）
  return process.env[key]?.trim() ?? "";
}

async function main() {
  const projectRef = env("NEXT_PUBLIC_SUPABASE_URL")
    .replace("https://", "")
    .replace(".supabase.co", "")
    .trim();

  if (!projectRef) {
    console.error("❌ 未找到 NEXT_PUBLIC_SUPABASE_URL");
    process.exit(1);
  }

  const host = `db.${projectRef}.supabase.co`;
  const password = env("SUPABASE_SERVICE_ROLE_KEY");

  if (!password) {
    console.error("❌ 未找到 SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const sqlFile = join(ROOT, "sql", "migrations", "20260620_v4_rls_comprehensive.sql");
  const sql = readFileSync(sqlFile, "utf8");

  console.log(`══ 应用 RLS 全面覆盖迁移 ══\n`);
  console.log(`目标: ${host}`);

  // 尝试 pg 直连
  const client = new pg.Client({
    host,
    port: 5432,
    database: "postgres",
    user: "postgres",
    password,
    ssl: { rejectUnauthorized: true },
    connectionTimeoutMillis: 10000,
  });

  try {
    await client.connect();
    console.log("✓ pg 已连接");
    await client.query(sql);
    console.log("✅ RLS 全面覆盖迁移已应用（pg）");
    await client.query("NOTIFY pgrst, 'reload schema'");
    console.log("✅ pgrst 已通知");
    await client.end();
  } catch (err) {
    console.warn(`⚠ pg 不可用（${err.message}），尝试 Supabase REST…`);

    // REST 回退：逐句执行
    const statements = sql
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !s.startsWith("--"));

    const baseUrl = `https://${projectRef}.supabase.co`;
    let ok = 0;
    let fail = 0;

    for (const stmt of statements) {
      try {
        const res = await fetch(`${baseUrl}/rest/v1/rpc/exec_sql`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: password,
            Authorization: `Bearer ${password}`,
          },
          body: JSON.stringify({ query: stmt }),
        });
        if (res.ok) {
          ok++;
        } else {
          fail++;
        }
      } catch {
        fail++;
      }
    }
    console.log(`REST 回退完成: ${ok} 条成功, ${fail} 条失败`);
  }

  console.log("\n备选：Supabase SQL Editor 执行");
  console.log(`  ${sqlFile}`);
}

main().catch((e) => {
  console.error("❌ 迁移失败:", e.message);
  process.exit(1);
});
