/**
 * npm run stats:codegen [-- days]
 * 统计 codegen_runs 成功率（按 target / status）
 */
import { applyEnvLocal } from "./lib/load-env-local.mjs";

const days = Math.max(1, Number(process.argv[2] ?? 30) || 30);

function printStats(rows, sinceLabel) {
  console.log(`══ Codegen 统计（${sinceLabel}）══\n`);

  const byTarget = {};
  for (const row of rows) {
    const t = row.target;
    const n = row.n ?? row.count ?? 1;
    if (!byTarget[t]) byTarget[t] = { total: 0, completed: 0, failed: 0, other: 0 };
    byTarget[t].total += n;
    if (row.status === "completed") byTarget[t].completed += n;
    else if (row.status === "failed") byTarget[t].failed += n;
    else byTarget[t].other += n;
  }

  for (const [target, stats] of Object.entries(byTarget)) {
    const rate =
      stats.total > 0
        ? ((stats.completed / stats.total) * 100).toFixed(1)
        : "—";
    console.log(
      `${target}: total=${stats.total} completed=${stats.completed} failed=${stats.failed} other=${stats.other} successRate=${rate}%`
    );
  }

  if (Object.keys(byTarget).length === 0) {
    console.log("（无记录）");
  }
}

async function queryViaPg(since) {
  const dbUrl = process.env.DATABASE_URL?.trim();
  if (!dbUrl) return null;
  const pg = (await import("pg")).default;
  const client = new pg.Client({ connectionString: dbUrl });
  await client.connect();
  try {
    const { rows } = await client.query(
      `select target, status, count(*)::int as n
       from public.codegen_runs
       where created_at >= $1
       group by target, status
       order by target, status`,
      [since]
    );
    return rows;
  } finally {
    await client.end();
  }
}

async function queryViaSupabase(since) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) return null;
  const { createClient } = await import("@supabase/supabase-js");
  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
  const { data, error } = await supabase
    .from("codegen_runs")
    .select("target, status")
    .gte("created_at", since);
  if (error) throw new Error(error.message);
  const buckets = {};
  for (const row of data ?? []) {
    const key = `${row.target}\0${row.status}`;
    buckets[key] = (buckets[key] ?? 0) + 1;
  }
  return Object.entries(buckets).map(([k, n]) => {
    const [target, status] = k.split("\0");
    return { target, status, n };
  });
}

async function main() {
  applyEnvLocal();
  const since = new Date(Date.now() - days * 86400000).toISOString();
  const sinceLabel = `近 ${days} 天，since ${since.slice(0, 10)}`;

  let rows = null;
  try {
    rows = await queryViaPg(since);
  } catch (e) {
    console.warn(
      `⚠ pg 不可用（${e instanceof Error ? e.message : e}），尝试 Supabase REST…`
    );
  }

  if (!rows) {
    rows = await queryViaSupabase(since);
    if (rows) {
      console.log("（数据源：Supabase REST）\n");
    }
  }

  if (!rows) {
    console.error("❌ 缺少 DATABASE_URL 或 Supabase URL/Service Role");
    process.exit(1);
  }

  printStats(rows, sinceLabel);
}

main().catch((e) => {
  console.error("❌", e instanceof Error ? e.message : e);
  process.exit(1);
});
