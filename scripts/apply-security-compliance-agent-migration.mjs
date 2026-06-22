/**
 * npm run db:apply:security-compliance-agent
 * 应用 sql/migrations/20260616_security_compliance_agent.sql
 *
 * 顺序：psql → node pg → Supabase REST（直连失败时）
 */
import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";
import { applySqlFile } from "./apply-sql-via-pg.mjs";
import { applyEnvLocal } from "./lib/load-env-local.mjs";

const root = process.cwd();
const sqlPath = path.join(
  root,
  "sql/migrations/20260616_security_compliance_agent.sql"
);

const ORDER_UPDATES = [
  { code: "ui_designer", order_index: 6 },
  { code: "dev_lead", order_index: 7 },
  { code: "qa_lead", order_index: 8 },
  { code: "business_advisor", order_index: 9 },
];

async function applyViaSupabaseRest() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    throw new Error("缺少 NEXT_PUBLIC_SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY");
  }

  const { createClient } = await import("@supabase/supabase-js");
  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: existing, error: existingErr } = await supabase
    .from("agents")
    .select("code")
    .eq("code", "security_compliance")
    .maybeSingle();
  if (existingErr) throw new Error(existingErr.message);

  if (!existing) {
    const { error: insertErr } = await supabase.from("agents").insert({
      code: "security_compliance",
      name: "安全与合规顾问",
      role: "Security & Compliance Advisor",
      description: "分析安全风险、隐私合规和法规要求，输出合规检查清单",
      order_index: 5,
    });
    if (insertErr) throw new Error(insertErr.message);
    console.log("  + 插入 security_compliance");
  } else {
    console.log("  · security_compliance 已存在，跳过插入");
  }

  for (const row of ORDER_UPDATES) {
    const { error } = await supabase
      .from("agents")
      .update({ order_index: row.order_index })
      .eq("code", row.code);
    if (error) throw new Error(`${row.code}: ${error.message}`);
    console.log(`  · ${row.code} → order_index=${row.order_index}`);
  }

  const { data: agents, error: listErr } = await supabase
    .from("agents")
    .select("code, order_index")
    .order("order_index");
  if (listErr) throw new Error(listErr.message);

  console.log("\n当前 agents（按 order_index）：");
  for (const a of agents ?? []) {
    console.log(`  ${a.order_index}\t${a.code}`);
  }

  if ((agents?.length ?? 0) !== 9) {
    throw new Error(`期望 9 条 agents，实际 ${agents?.length ?? 0}`);
  }
}

async function main() {
  applyEnvLocal();
  const dbUrl = process.env.DATABASE_URL?.trim();

  console.log("══ 应用 security_compliance Agent 迁移 ══\n");

  if (dbUrl?.startsWith("postgres")) {
    const psql = spawnSync(
      "psql",
      [dbUrl, "-v", "ON_ERROR_STOP=1", "-f", sqlPath],
      { stdio: "inherit" }
    );

    if (psql.status === 0) {
      spawnSync(
        "psql",
        [dbUrl, "-v", "ON_ERROR_STOP=1", "-c", "NOTIFY pgrst, 'reload schema';"],
        { stdio: "inherit" }
      );
      console.log("\n✅ security_compliance 迁移已应用（psql）");
      return;
    }

    console.log("psql 不可用，改用 node pg…\n");
    try {
      await applySqlFile(dbUrl, sqlPath);
      console.log("\n✅ security_compliance 迁移已应用（pg）+ NOTIFY pgrst");
      return;
    } catch (err) {
      console.warn(
        `⚠ pg 不可用（${err instanceof Error ? err.message : err}），尝试 Supabase REST…\n`
      );
    }
  } else {
    console.log("未配置 DATABASE_URL，尝试 Supabase REST…\n");
  }

  try {
    await applyViaSupabaseRest();
    console.log("\n✅ security_compliance 迁移已应用（Supabase REST）");
  } catch (err) {
    console.error("\n❌ 迁移失败:", err instanceof Error ? err.message : err);
    console.error("\n备选：Supabase SQL Editor 执行");
    console.error(`  ${sqlPath}`);
    process.exit(1);
  }
}

main();
