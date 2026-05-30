/**
 * 用 node pg 执行 SQL 文件（psql 不可用时的 fallback）
 */
import fs from "fs";

export async function applySqlFile(dbUrl, sqlPath) {
  let pg;
  try {
    pg = await import("pg");
  } catch {
    throw new Error(
      "未安装 psql 且缺少 pg 包。请执行 npm install 或 Supabase SQL Editor 手动跑迁移。"
    );
  }

  const sql = fs.readFileSync(sqlPath, "utf8");
  const client = new pg.default.Client({
    connectionString: dbUrl,
    ssl: dbUrl.includes("supabase.co") ? { rejectUnauthorized: false } : undefined
  });

  await client.connect();
  try {
    await client.query(sql);
    await client.query("NOTIFY pgrst, 'reload schema';");
  } finally {
    await client.end();
  }
}
