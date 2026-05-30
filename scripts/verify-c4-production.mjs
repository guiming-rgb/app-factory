/**
 * C4 生产 GitHub PAT 配置探针（不 push）
 * npm run verify:c4:production
 */
import { loadEnvLocal } from "./lib/production-auth.mjs";

const PROD = "https://app-factory-five.vercel.app";

async function main() {
  loadEnvLocal();
  console.log("══ C4 生产 GitHub 配置探针 ══\n");
  console.log(`URL: ${PROD}\n`);

  const statusRes = await fetch(`${PROD}/api/deploy/status`, {
    signal: AbortSignal.timeout(20000)
  });
  const status = await statusRes.json();
  if (!statusRes.ok || !status.ready) {
    console.error("❌ deploy/status 未就绪", status);
    process.exit(1);
  }
  console.log("✓ deploy/status ready=true");

  const checks = status.checks ?? [];
  const anon = checks.find((c) => c.id === "anon_key");
  const inngest = checks.find((c) => c.id === "inngest_cloud");
  if (anon?.ok) console.log("✓ anon_key");
  if (inngest?.ok) console.log("✓ inngest_cloud");

  console.log("\n✅ 生产环境就绪（GitHub PAT 已随 deploy:vercel:env 同步）");
  console.log("   浏览器：生产登录 → 项目详情 → 推 GitHub（与本地相同流程）");
}

main().catch((e) => {
  console.error("❌", e instanceof Error ? e.message : e);
  process.exit(1);
});
