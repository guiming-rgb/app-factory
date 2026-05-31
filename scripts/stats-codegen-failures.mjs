/**
 * npm run stats:codegen:failures [-- days]
 * 统计 failed run 的 log 高频原因
 */
import { applyEnvLocal } from "./lib/load-env-local.mjs";

const days = Math.max(1, Number(process.argv[2] ?? 30) || 30);

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

async function aggregateFailures(rows) {
  console.log(`══ Codegen 失败 Top 原因（近 ${days} 天）══\n`);

  const buckets = {};
  for (const row of rows) {
    const key = `${row.target} · ${bucketLog(row.log)}`;
    buckets[key] = (buckets[key] ?? 0) + (row.n ?? 1);
  }

  const sorted = Object.entries(buckets).sort((a, b) => b[1] - a[1]);
  if (!sorted.length) {
    console.log("（无 failed 记录）");
    return;
  }

  for (const [reason, n] of sorted.slice(0, 12)) {
    console.log(`${String(n).padStart(3)}  ${reason}`);
  }
}

async function queryFailuresPg(since) {
  const dbUrl = process.env.DATABASE_URL?.trim();
  if (!dbUrl) return null;
  const pg = (await import("pg")).default;
  const client = new pg.Client({ connectionString: dbUrl });
  await client.connect();
  try {
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
    return rows;
  } finally {
    await client.end();
  }
}

async function queryFailuresSupabase(since) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) return null;
  const { createClient } = await import("@supabase/supabase-js");
  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
  const { data, error } = await supabase
    .from("codegen_runs")
    .select("target, log")
    .eq("status", "failed")
    .gte("created_at", since)
    .limit(500);
  if (error) throw new Error(error.message);
  const buckets = {};
  for (const row of data ?? []) {
    const log = (row.log ?? "").slice(0, 200);
    const key = `${row.target}\0${log}`;
    buckets[key] = (buckets[key] ?? 0) + 1;
  }
  return Object.entries(buckets).map(([k, n]) => {
    const i = k.indexOf("\0");
    return {
      target: k.slice(0, i),
      log: k.slice(i + 1),
      n
    };
  });
}

async function main() {
  applyEnvLocal();
  const since = new Date(Date.now() - days * 86400000).toISOString();

  let rows = null;
  try {
    rows = await queryFailuresPg(since);
  } catch (e) {
    console.warn(
      `⚠ pg 不可用（${e instanceof Error ? e.message : e}），尝试 Supabase REST…`
    );
  }
  if (!rows) {
    rows = await queryFailuresSupabase(since);
  }
  if (!rows) {
    console.error("❌ 缺少 DATABASE_URL 或 Supabase URL/Service Role");
    process.exit(1);
  }

  await aggregateFailures(rows);
}

main().catch((e) => {
  console.error("❌", e instanceof Error ? e.message : e);
  process.exit(1);
});
