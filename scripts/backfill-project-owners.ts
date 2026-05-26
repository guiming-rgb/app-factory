/**
 * 历史 projects.owner_id 回填（维护者拍板后执行）
 *
 * npm run db:backfill:owners -- --strategy=B --owner=<user-uuid>
 *
 * 策略：
 *   A（默认）仅报告：列出 owner_id 为 null 的项目，不写库
 *   B 回填：将全部 null 项目赋给 --owner
 *   C 归档：将 null 项目 status 改为 archived（若列/枚举不支持则失败）
 */
import "../lib/load-env-local";
import { createClient } from "@supabase/supabase-js";

function parseArgs(argv: string[]) {
  let strategy = "A";
  let owner = "";
  for (const arg of argv) {
    if (arg.startsWith("--strategy=")) {
      strategy = arg.slice("--strategy=".length).toUpperCase();
    } else if (arg.startsWith("--owner=")) {
      owner = arg.slice("--owner=".length).trim();
    }
  }
  return { strategy, owner };
}

async function main() {
  const { strategy, owner } = parseArgs(process.argv.slice(2));
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    console.error("❌ 缺 NEXT_PUBLIC_SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const admin = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const { data: rows, error } = await admin
    .from("projects")
    .select("id, title, status, created_at")
    .is("owner_id", null)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("❌ 查询失败:", error.message);
    process.exit(1);
  }

  console.log(`══ owner_id 回填 · 策略 ${strategy} ══\n`);
  console.log(`null 项目数：${rows?.length ?? 0}\n`);

  for (const row of rows ?? []) {
    console.log(`- ${row.id} · ${row.title ?? "（无标题）"} · ${row.status}`);
  }

  if (strategy === "A") {
    console.log("\n✅ 策略 A：仅报告，未写库。拍板 B/C 后重跑并传 --strategy。");
    return;
  }

  if (strategy === "B") {
    if (!owner) {
      console.error("\n❌ 策略 B 需要 --owner=<supabase-auth-user-uuid>");
      process.exit(1);
    }
    const ids = (rows ?? []).map((r) => r.id);
    if (!ids.length) {
      console.log("\n✅ 无需回填");
      return;
    }
    const { error: updErr } = await admin
      .from("projects")
      .update({ owner_id: owner, updated_at: new Date().toISOString() })
      .in("id", ids);
    if (updErr) {
      console.error("❌ 回填失败:", updErr.message);
      process.exit(1);
    }
    console.log(`\n✅ 已将 ${ids.length} 个项目 owner_id 设为 ${owner}`);
    return;
  }

  if (strategy === "C") {
    const ids = (rows ?? []).map((r) => r.id);
    if (!ids.length) {
      console.log("\n✅ 无需归档");
      return;
    }
    const { error: updErr } = await admin
      .from("projects")
      .update({ status: "archived", updated_at: new Date().toISOString() })
      .in("id", ids);
    if (updErr) {
      console.warn(
        "\n⚠️ 策略 C 失败（可能无 archived 状态枚举）:",
        updErr.message
      );
      process.exit(1);
    }
    console.log(`\n✅ 已将 ${ids.length} 个项目标为 archived`);
    return;
  }

  console.error(`❌ 未知策略: ${strategy}（用 A | B | C）`);
  process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
