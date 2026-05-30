/**
 * v3 生产环境验收（Vercel + Inngest Cloud + Supabase）
 * npm run verify:v3:production
 *
 * v4 Auth 启用时需 .env.local：V4_TEST_EMAIL / V4_TEST_PASSWORD
 */
import {
  createSessionCookieHeader,
  isAuthConfigured,
  loadEnvLocal
} from "./lib/production-auth.mjs";
import {
  isNetworkError,
  runFullChainProbe
} from "./lib/full-chain-probe.mjs";

const BASE =
  process.env.V3_PRODUCTION_URL?.trim() ??
  "https://app-factory-five.vercel.app";

function fail(msg) {
  console.error(`\n❌ ${msg}`);
  process.exit(1);
}

async function main() {
  loadEnvLocal();

  console.log("══ v3 生产环境验收 ══\n");
  console.log(`URL: ${BASE}\n`);

  let cookieHeader = null;
  if (isAuthConfigured()) {
    try {
      const session = await createSessionCookieHeader();
      cookieHeader = session.cookieHeader;
      console.log(`✓ 测试账号已登录 (${session.email})\n`);
    } catch (e) {
      fail(e instanceof Error ? e.message : String(e));
    }
  } else {
    console.log("⏭ Auth 未配置 anon key — 以匿名模式探针\n");
  }

  try {
    const result = await runFullChainProbe({
      base: BASE,
      cookieHeader,
      ideaPrefix: "v3生产验收"
    });
    console.log("\n✅ verify:v3:production 通过");
    console.log(`   样本项目: ${result.projectId}`);
  } catch (e) {
    if (isNetworkError(e)) {
      console.warn(
        `\n⚠️  生产 URL 网络不可达 — 本地可跑：npm run verify:s6:local-full`
      );
      console.warn(`   （需 3001 + inngest:dev:3001 已启动）`);
      process.exit(2);
    }
    fail(e instanceof Error ? e.message : String(e));
  }
}

main().catch((e) => {
  if (isNetworkError(e)) {
    console.warn("\n⚠️  verify:v3:production 跳过（网络）");
    process.exit(2);
  }
  console.error(e);
  process.exit(1);
});
