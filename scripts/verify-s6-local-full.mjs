/**
 * S6 本地发版全链路（3001 + Inngest Dev + Auth）
 * npm run verify:s6:local-full
 */
import {
  createSessionCookieHeader,
  isAuthConfigured,
  loadEnvLocal
} from "./lib/production-auth.mjs";
import { isNetworkError, runFullChainProbe } from "./lib/full-chain-probe.mjs";

const BASE =
  process.env.S6_LOCAL_URL?.trim() ??
  process.env.NEXT_PUBLIC_APP_URL?.trim() ??
  "http://localhost:3001";

function fail(msg) {
  console.error(`\n❌ ${msg}`);
  process.exit(1);
}

async function main() {
  loadEnvLocal();

  console.log("══ S6 本地发版全链路 ══\n");
  console.log(`URL: ${BASE}`);
  console.log("前置：npm run start -- -p 3001 · npm run inngest:dev:3001\n");

  if (!isAuthConfigured()) {
    fail("本地 Auth 需 NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }

  try {
    const inngestProbe = await fetch("http://127.0.0.1:8288/", {
      signal: AbortSignal.timeout(3000)
    }).catch(() => null);
    if (!inngestProbe?.ok) {
      console.warn(
        "⚠️  Inngest Dev (http://127.0.0.1:8288) 未响应 — generate 可能失败"
      );
      console.warn("   请先：npm run inngest:dev:3001\n");
    } else {
      console.log("✓ Inngest Dev 已响应 (8288)\n");
    }
  } catch {
    console.warn("⚠️  无法探测 Inngest Dev — 请确认 inngest:dev:3001 已启动\n");
  }

  let cookieHeader;
  try {
    const session = await createSessionCookieHeader();
    cookieHeader = session.cookieHeader;
    console.log(`✓ 测试账号已登录 (${session.email})\n`);
  } catch (e) {
    fail(e instanceof Error ? e.message : String(e));
  }

  try {
    const result = await runFullChainProbe({
      base: BASE,
      cookieHeader,
      ideaPrefix: "S6本地验收"
    });
    console.log("\n✅ verify:s6:local-full 通过");
    console.log(`   样本项目: ${result.projectId}`);
  } catch (e) {
    if (isNetworkError(e) || e?.cause?.code === "ECONNREFUSED") {
      fail(
        `${BASE} 不可达 — 请先启动 Next（3001）与 Inngest Dev（inngest:dev:3001）`
      );
    }
    fail(e instanceof Error ? e.message : String(e));
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
