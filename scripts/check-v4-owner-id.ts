/**
 * 检查 projects.owner_id 列是否对 Service Role 可见
 * npm run check:v4:owner
 */
import "../lib/load-env-local";
import { createClient } from "@supabase/supabase-js";

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    console.error("❌ 缺 NEXT_PUBLIC_SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const host = url.replace(/^https?:\/\//, "").split("/")[0];
  console.log(`══ v4 owner_id 列检查 ══\nSupabase: ${host}\n`);

  const admin = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const { error } = await admin.from("projects").select("owner_id").limit(1);
  if (error) {
    console.error("❌ projects.owner_id 不可查询:", error.message);
    console.error("\n请执行：npm run db:apply:v4-owner");
    console.error("或 SQL Editor 跑 sql/migrations/20260526_v4_owner_id.sql");
    process.exit(1);
  }

  const { count: withOwner } = await admin
    .from("projects")
    .select("*", { count: "exact", head: true })
    .not("owner_id", "is", null);

  const { count: total } = await admin
    .from("projects")
    .select("*", { count: "exact", head: true });

  console.log(`✅ projects.owner_id 列已就绪`);
  console.log(`   总行数 ${total ?? 0} · 已绑定 owner ${withOwner ?? 0}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
