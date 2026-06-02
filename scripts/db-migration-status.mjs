#!/usr/bin/env node
/**
 * B-2: 数据库迁移状态检查
 * 列出所有迁移文件及其执行状态
 */
import { readdirSync } from "fs";
import { join } from "path";
import pg from "pg";

const MIGRATIONS_DIR = join(process.cwd(), "sql/migrations");

async function main() {
  const files = readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith(".sql")).sort();

  console.log("\n══ 迁移状态 ══\n");

  // 尝试连接数据库
  const client = new pg.Client({
    connectionString: process.env.DATABASE_URL || process.env.SUPABASE_DB_URL,
    ssl: { rejectUnauthorized: false },
  });

  let connected = false;
  try {
    await client.connect();
    connected = true;

    // 确保迁移记录表存在
    await client.query(`
      create table if not exists _migrations (
        filename text primary key,
        executed_at timestamptz default now()
      );
    `);

    const { rows: executed } = await client.query("select filename from _migrations order by executed_at");
    const executedSet = new Set(executed.map((r) => r.filename));

    let pending = 0;
    for (const file of files) {
      const done = executedSet.has(file);
      console.log(done ? `✅ ${file}` : `⬜ ${file} (待执行)`);
      if (!done) pending++;
    }

    console.log(`\n${files.length} 个迁移文件，${files.length - pending} 已执行，${pending} 待执行。`);
    if (pending > 0) console.log("执行: npm run db:apply:<name>");
  } catch (e) {
    console.log("⚠ 无法连接数据库（设置 DATABASE_URL 或 SUPABASE_DB_URL）");
    console.log(files.map((f) => `  ⬜ ${f}`).join("\n"));
  } finally {
    if (connected) await client.end();
  }
}

main().catch(console.error);
