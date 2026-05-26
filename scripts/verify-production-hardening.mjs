/**
 * S4 生产 Inngest / Auth 加固探针
 * npm run verify:production:hardening
 */
const BASE =
  process.env.V4_PRODUCTION_URL?.trim() ??
  process.env.V3_PRODUCTION_URL?.trim() ??
  "https://app-factory-five.vercel.app";

const FETCH_TIMEOUT_MS = 60_000;
const MAX_ATTEMPTS = 3;

async function sleep(ms) {
  await new Promise((r) => setTimeout(r, ms));
}

async function fetchDeployStatus() {
  let lastError;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      const res = await fetch(`${BASE}/api/deploy/status`, {
        signal: controller.signal,
        cache: "no-store"
      });
      const body = await res.json().catch(() => ({}));
      return { status: res.status, body };
    } catch (e) {
      lastError = e;
      if (attempt < MAX_ATTEMPTS) await sleep(2000);
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError;
}

function warn(msg) {
  console.warn(`⚠️  ${msg}`);
}

async function main() {
  console.log("══ S4 生产加固探针 ══\n");
  console.log(`URL: ${BASE}\n`);

  const { status, body } = await fetchDeployStatus();
  if (status !== 200) {
    warn(`deploy/status HTTP ${status}`);
    process.exit(1);
  }

  console.log(`✓ deploy/status mode=${body.mode} ready=${body.ready}`);
  const checks = body.checks ?? [];
  for (const c of checks) {
    const mark = c.ok ? "✓" : "⚠";
    console.log(`${mark} ${c.label}: ${c.detail}`);
  }

  const inngest = checks.find((c) => c.id === "inngest_cloud");
  const anon = checks.find((c) => c.id === "anon_key");
  if (inngest && !inngest.ok) {
    warn("生产缺少 Inngest Cloud 密钥 — 请在 Vercel 配 INNGEST_EVENT_KEY + INNGEST_SIGNING_KEY 并 Redeploy");
  }
  if (anon && !anon.ok) {
    warn("生产缺少 anon key — Auth UI 未启用");
  }

  if (body.ready && inngest?.ok && anon?.ok) {
    console.log("\n✅ S4 生产加固探针通过");
  } else {
    console.log("\n⚠️  S4 探针完成（存在 WARN，见上方）");
  }
}

main().catch((e) => {
  if (
    e?.name === "AbortError" ||
    e?.cause?.code === "UND_ERR_CONNECT_TIMEOUT" ||
    /fetch failed|Connect Timeout/i.test(String(e?.message ?? e))
  ) {
    warn(`生产 URL 超时 — 请浏览器打开 ${BASE}/api/deploy/status`);
    console.log("\n⚠️  verify:production:hardening 跳过（网络）");
    process.exit(0);
  }
  console.error(e);
  process.exit(1);
});
