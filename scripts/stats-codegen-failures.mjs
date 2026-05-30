/**
 * npm run stats:codegen:failures [-- days]
 * 统计 failed run 的 log 高频原因
 */
import fs from "fs";
import path from "path";

const root = process.cwd();
const days = Math.max(1, Number(process.argv[2] ?? 30) || 30);

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

function bucketLog(log) {
  if (!log) return "（无 log）";
  const s = log.slice(0, 120);
  if (/Inngest|8288|queued|未消费/i.test(s)) return "Inngest 未消费/队列";
  if (/analyze|dart/i.test(s)) return "Flutter analyze/build";
  if (/wcc|wcsc|小程序|wechat/i.test(s)) return "小程序编译";
  if (/鸿蒙|harmony|结构门禁|main_pages/i.test(s)) return "鸿蒙结构/生成";
  if (/Spec|校验/i.test(s)) return "App Spec 校验";
  if (/stale|超时|手动/i.test(s)) return "超时/手动取消";
  if (/GitHub|push/i.test(s)) return "GitHub 推送";
  return s.length > 60 ? `${s.slice(0, 57)}…` : s;
}

async function main() {
  const env = { ...process.env, ...loadEnvLocal() };
  const dbUrl = env.DATABASE_URL?.trim();
  if (!dbUrl) {
    console.error("❌ 缺少 DATABASE_URL");
    process.exit(1);
  }

  const pg = (await import("pg")).default;
  const client = new pg.Client({ connectionString: dbUrl });
  await client.connect();

  try {
    const since = new Date(Date.now() - days * 86400000).toISOString();
    const { rows } = await client.query(
      `select target, log, count(*)::int as n
       from (
         select target, left(coalesce(log,''), 200) as log
         from public.codegen_runs
         where status = 'failed' and created_at >= $1
       ) t
       group by target, log
       order by n desc
       limit 40`,
      [since]
    );

    console.log(`══ Codegen 失败 Top 原因（近 ${days} 天）══\n`);

    const buckets = {};
    for (const row of rows) {
      const key = `${row.target} · ${bucketLog(row.log)}`;
      buckets[key] = (buckets[key] ?? 0) + row.n;
    }

    const sorted = Object.entries(buckets).sort((a, b) => b[1] - a[1]);
    if (!sorted.length) {
      console.log("（无 failed 记录）");
      return;
    }

    for (const [reason, n] of sorted.slice(0, 12)) {
      console.log(`${String(n).padStart(3)}  ${reason}`);
    }
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error("❌", e instanceof Error ? e.message : e);
  process.exit(1);
});
