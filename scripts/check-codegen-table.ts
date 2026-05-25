/**
 * 检查 codegen_runs 是否对当前 .env.local 可见
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
  console.log(`Supabase 主机: ${host}\n`);

  const admin = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const { error } = await admin.from("codegen_runs").select("id").limit(1);
  if (error) {
    console.error("❌ codegen_runs 不可查询:", error.message);
    console.error("\n常见原因：");
    console.error("  1) SQL 跑在了别的 Supabase 项目（与 .env.local URL 不一致）");
    console.error("  2) PostgREST 缓存未刷新 → Dashboard → Settings → API → Reload schema");
    process.exit(1);
  }

  const { count, error: countErr } = await admin
    .from("codegen_runs")
    .select("*", { count: "exact", head: true });
  if (countErr) {
    console.error("❌ 计数失败:", countErr.message);
    process.exit(1);
  }

  console.log(`✅ codegen_runs 表可访问（当前行数约 ${count ?? 0}）`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
