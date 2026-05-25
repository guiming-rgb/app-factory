/**
 * 检查 RLS 是否生效（anon 未登录不可读 projects）
 * npm run check:v4:rls
 */
import "../lib/load-env-local";
import { createClient } from "@supabase/supabase-js";

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!url || !serviceKey) {
    console.error("❌ 缺 NEXT_PUBLIC_SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const host = url.replace(/^https?:\/\//, "").split("/")[0];
  console.log(`══ v4 RLS 检查 ══\nSupabase: ${host}\n`);

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const { error: adminErr } = await admin.from("projects").select("id").limit(1);
  if (adminErr) {
    console.error("❌ service_role 读 projects 失败:", adminErr.message);
    process.exit(1);
  }
  console.log("✓ service_role 可读 projects（Inngest / 后台任务不受影响）");

  if (!anonKey) {
    console.warn("\n⚠️ 未配置 NEXT_PUBLIC_SUPABASE_ANON_KEY，跳过 anon 探针");
    console.log("   配置 anon key 后重跑本脚本以确认 RLS");
    process.exit(0);
  }

  const anon = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const { data: rows, error: anonErr } = await anon
    .from("projects")
    .select("id")
    .limit(1);

  if (anonErr) {
    console.log(`✓ anon 未登录读 projects 被拒绝：${anonErr.message}`);
  } else if ((rows ?? []).length === 0) {
    console.log("✓ anon 未登录读 projects 返回 0 行");
  } else {
    console.error("❌ anon 未登录却能读到 projects，请执行 npm run db:apply:v4-rls");
    process.exit(1);
  }

  console.log("\n✅ RLS 探针通过");
  console.log("   双用户隔离（A 不能读 B）需在 SQL Editor 用 authenticated 角色验收，见 v4 草案 §10");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
