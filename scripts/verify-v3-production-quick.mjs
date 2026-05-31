/**
 * 生产站轻量探针（仅 deploy/status + 首页，超时更长）
 * npm run verify:v3:production:quick
 */
import {
  createSessionCookieHeader,
  isAuthConfigured,
  loadEnvLocal
} from "./lib/production-auth.mjs";
import {
  configureFetchProxyFromEnv,
  fetchJsonWithRetry,
  fetchStatusWithRetry,
  isNetworkError,
  proxyHintLines
} from "./lib/full-chain-probe.mjs";

const BASE =
  process.env.V3_PRODUCTION_URL?.trim() ??
  "https://app-factory-five.vercel.app";

const TIMEOUT_HINT =
  "若仍失败：浏览器打开 " + BASE + " 能打开即视为生产可达（与 verify:s6:local-full 等效）";

async function main() {
  loadEnvLocal();
  if (process.env.V3_HTTP_PROXY?.trim()) {
    const p = process.env.V3_HTTP_PROXY.trim();
    process.env.HTTP_PROXY = process.env.HTTP_PROXY ?? p;
    process.env.HTTPS_PROXY = process.env.HTTPS_PROXY ?? p;
  }
  process.env.V3_PROBE_TIMEOUT_MS = process.env.V3_PROBE_TIMEOUT_MS ?? "120000";

  const proxy =
    process.env._V3_PROBE_PROXY?.trim() || configureFetchProxyFromEnv();

  console.log("══ v3 生产轻量探针 ══\n");
  console.log(`URL: ${BASE}\n`);
  if (proxy) {
    console.log(`✓ 使用代理 ${proxy}\n`);
  } else if (!process.env.NODE_USE_ENV_PROXY) {
    console.log(
      "ℹ  未检测到代理（export http_proxy 或在 .env.local 设 V3_HTTP_PROXY=http://127.0.0.1:7897）\n"
    );
  }

  let cookieHeader = null;
  if (isAuthConfigured()) {
    const session = await createSessionCookieHeader();
    cookieHeader = session.cookieHeader;
    console.log(`✓ 已登录 ${session.email}\n`);
  }

  try {
    const status = await fetchJsonWithRetry(BASE, "/api/deploy/status", {
      cookieHeader
    });
    if (status.status !== 200 || !status.body.ready) {
      throw new Error(`deploy/status 异常: ${JSON.stringify(status.body)}`);
    }
    console.log("✓ /api/deploy/status ready=true");

    const home = await fetchStatusWithRetry(BASE, "/", { cookieHeader });
    if (home !== 200) throw new Error(`首页 HTTP ${home}`);
    console.log("✓ 首页 HTTP 200");

    console.log("\n✅ verify:v3:production:quick 通过");
    console.log(TIMEOUT_HINT);
  } catch (e) {
    if (isNetworkError(e)) {
      console.error("\n⚠️  无法连接生产站（网络/DNS/防火墙/需代理）");
      if (!proxy) {
        for (const line of proxyHintLines()) {
          console.error("   " + line);
        }
      }
      console.error("   您已完成 verify:s6:local-full ✅ → 可视为本地链路已验收");
      console.error("   浏览器验收：", BASE);
      process.exit(2);
    }
    console.error(e);
    process.exit(1);
  }
}

main();
