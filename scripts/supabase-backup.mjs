#!/usr/bin/env node
/**
 * P3: Supabase 数据库自动备份
 *
 * 用法:
 *   node scripts/supabase-backup.mjs                      # 立即备份
 *   node scripts/supabase-backup.mjs --keep 7             # 保留最近 7 天
 *   node scripts/supabase-backup.mjs --quiet              # 静默模式（cron）
 *
 * Cron 配置（每天凌晨 3 点）:
 *   0 3 * * * cd /path/to/app-factory && node scripts/supabase-backup.mjs --quiet --keep 14
 *
 * 环境变量:
 *   DATABASE_URL 或 SUPABASE_DB_URL  — PostgreSQL 连接字符串
 *   SUPABASE_SERVICE_ROLE_KEY        — (可选) Supabase Management API 方式
 *   SUPABASE_PROJECT_REF             — (可选) 项目 ref，与 Management API 配合
 *   BACKUP_DIR                       — (可选) 备份输出目录，默认 backups/
 */

import { execSync } from "child_process";
import { existsSync, mkdirSync, readdirSync, rmSync, writeFileSync, statSync } from "fs";
import { join, resolve } from "path";
import { fileURLToPath } from "url";

// ─── Config ────────────────────────────────────────────────

const __dirname = resolve(fileURLToPath(import.meta.url), "..");
const ROOT = resolve(__dirname, "..");
const DEFAULT_BACKUP_DIR = join(ROOT, "backups");
const BACKUP_DIR = process.env.BACKUP_DIR || DEFAULT_BACKUP_DIR;
const DATABASE_URL = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL || "";
const SUPABASE_PROJECT_REF = process.env.SUPABASE_PROJECT_REF || "";

// Keep N most recent backups (default: keep all)
const KEEP_DAYS = parseKeepDays(process.argv);

// ─── Parse CLI ─────────────────────────────────────────────

function parseKeepDays(argv) {
  const idx = argv.indexOf("--keep");
  if (idx !== -1 && idx + 1 < argv.length) {
    const n = parseInt(argv[idx + 1], 10);
    if (!isNaN(n) && n > 0) return n;
  }
  return 0; // keep all
}

function isQuiet(argv) {
  return argv.includes("--quiet");
}

function log(msg) {
  if (!isQuiet(process.argv)) {
    console.log(`[supabase-backup] ${msg}`);
  }
}

function warn(msg) {
  console.warn(`[supabase-backup] ⚠ ${msg}`);
}

function err(msg) {
  console.error(`[supabase-backup] ❌ ${msg}`);
}

// ─── Help ──────────────────────────────────────────────────

if (process.argv.includes("--help") || process.argv.includes("-h")) {
  console.log(`
Usage: node scripts/supabase-backup.mjs [options]

Options:
  --keep <N>    Keep only N most recent backups, delete older ones
  --quiet       Suppress non-error output (for cron)
  --help, -h    Show this help

Environment:
  DATABASE_URL or SUPABASE_DB_URL  (required) PostgreSQL connection string
  SUPABASE_PROJECT_REF             (optional) for Supabase Management API
  BACKUP_DIR                       (optional) backup output directory

Cron example:
  0 3 * * * cd /root/app-factory && node scripts/supabase-backup.mjs --quiet --keep 14
`);
  process.exit(0);
}

// ─── Main ──────────────────────────────────────────────────

async function main() {
  // 1. Validate environment
  if (!DATABASE_URL) {
    err("需要设置 DATABASE_URL 或 SUPABASE_DB_URL 环境变量");
    process.exit(1);
  }

  // 2. Create date-stamped backup directory
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10); // YYYY-MM-DD
  const backupDir = join(BACKUP_DIR, dateStr);

  mkdirSync(backupDir, { recursive: true });
  log(`备份目录: ${backupDir}`);

  // 3. Perform pg_dump
  const sqlFile = join(backupDir, `${dateStr}_full.sql`);
  const timestamp = today.toISOString().replace(/[T.]/g, "_").slice(0, 19);

  log(`开始导出数据库...`);
  try {
    execSync(
      `pg_dump "${DATABASE_URL}" --no-owner --no-acl --verbose > "${sqlFile}"`,
      {
        encoding: "utf8",
        timeout: 300_000, // 5 minutes
        stdio: isQuiet(process.argv) ? ["ignore", "pipe", "pipe"] : ["ignore", "inherit", "inherit"],
      }
    );
    const stats = existsSync(sqlFile) ? getFileSize(sqlFile) : "?";
    log(`✅ 数据库导出完成: ${sqlFile} (${stats})`);
  } catch (e) {
    err(`pg_dump 失败: ${e.message}`);
    process.exit(1);
  }

  // 4. Write backup manifest
  const manifest = {
    date: dateStr,
    timestamp,
    file: `${dateStr}_full.sql`,
    size_bytes: existsSync(sqlFile) ? getFileSizeBytes(sqlFile) : 0,
    database_url_masked: DATABASE_URL.replace(/\/\/[^:]+:[^@]+@/, "//***:***@"),
    project_ref: SUPABASE_PROJECT_REF || null,
  };
  writeFileSync(join(backupDir, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n", "utf8");
  log(`备份清单: ${join(backupDir, "manifest.json")}`);

  // 5. Cleanup old backups (if --keep is set)
  if (KEEP_DAYS > 0) {
    const cutoff = new Date(today);
    cutoff.setDate(cutoff.getDate() - KEEP_DAYS);

    try {
      const entries = readdirSync(BACKUP_DIR, { withFileTypes: true });
      let removed = 0;
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        const dirDate = new Date(entry.name);
        if (isNaN(dirDate.getTime())) continue;
        if (dirDate < cutoff) {
          const fullPath = join(BACKUP_DIR, entry.name);
          rmSync(fullPath, { recursive: true, force: true });
          removed++;
        }
      }
      if (removed > 0) log(`🧹 清理了 ${removed} 个过期备份目录（保留最近 ${KEEP_DAYS} 天）`);
    } catch (e) {
      warn(`清理备份失败: ${e.message}`);
    }
  }

  log("✅ 备份流程完成");
}

// ─── Utilities ─────────────────────────────────────────────

function getFileSize(filePath) {
  const bytes = getFileSizeBytes(filePath);
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

function getFileSizeBytes(filePath) {
  try {
    return statSync(filePath).size;
  } catch {
    return 0;
  }
}

// Run
main().catch((e) => {
  err(`未捕获错误: ${e.message}`);
  process.exit(1);
});
