#!/usr/bin/env node
/**
 * P0-2: Supabase 数据库备份
 * 用法: node scripts/db-backup.mjs
 * 需要: DATABASE_URL 或 SUPABASE_DB_URL
 */
import { execSync } from "child_process";
import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";

const BACKUP_DIR = join(process.cwd(), "backups");
const url = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;

if (!url) {
  console.log("⚠ 未设置 DATABASE_URL 或 SUPABASE_DB_URL");
  process.exit(1);
}

const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
const file = join(BACKUP_DIR, `backup-${date}.sql`);

try {
  mkdirSync(BACKUP_DIR, { recursive: true });
  execSync(`pg_dump "${url}" > "${file}"`, { encoding: "utf8", timeout: 60000 });
  console.log(`✅ 备份完成: ${file}`);
} catch (e) {
  console.log(`❌ 备份失败: ${e.message}`);
  process.exit(1);
}
