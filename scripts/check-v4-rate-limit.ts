/**
 * 检查 api_rate_limit_events 表是否可见
 * npm run check:v4:rate-limit
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

  const admin = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const { error } = await admin.from("api_rate_limit_events").select("id").limit(1);
  if (error) {
    console.error("❌ api_rate_limit_events 不可访问:", error.message);
    console.error("\n请执行：npm run db:apply:v4-rate-limit");
    process.exit(1);
  }

  console.log("✅ api_rate_limit_events 表已就绪");
  console.log(
    `   默认配额：generate ${process.env.RATE_LIMIT_GENERATE_PER_HOUR ?? "10"}/h · codegen ${process.env.RATE_LIMIT_CODEGEN_PER_HOUR ?? "20"}/h（0=关闭）`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
