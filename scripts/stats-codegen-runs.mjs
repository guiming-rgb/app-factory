/**
 * npm run stats:codegen [-- days]
 * 统计 codegen_runs 成功率（按 target / status）
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
      `select target, status, count(*)::int as n
       from public.codegen_runs
       where created_at >= $1
       group by target, status
       order by target, status`,
      [since]
    );

    console.log(`══ Codegen 统计（近 ${days} 天，since ${since.slice(0, 10)}）══\n`);

    const byTarget = {};
    for (const row of rows) {
      const t = row.target;
      if (!byTarget[t]) byTarget[t] = { total: 0, completed: 0, failed: 0, other: 0 };
      byTarget[t].total += row.n;
      if (row.status === "completed") byTarget[t].completed += row.n;
      else if (row.status === "failed") byTarget[t].failed += row.n;
      else byTarget[t].other += row.n;
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
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error("❌", e instanceof Error ? e.message : e);
  process.exit(1);
});
