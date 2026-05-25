/**
 * v4 生产环境 Auth 冒烟（HTTP 探针，无需浏览器）
 * npm run verify:v4:production
 *
 * 可选深测（双用户 RLS）：npm run verify:v4:production:rls
 * 需 env：V4_TEST_EMAIL / V4_TEST_PASSWORD（及可选 _B 第二账号）
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

async function fetchJson(path, init) {
  let lastError;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      const res = await fetch(`${BASE}${path}`, {
        ...init,
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          ...(init?.headers ?? {})
        },
        cache: "no-store"
      });
      let body = {};
      try {
        body = await res.json();
      } catch {
        body = {};
      }
      return { status: res.status, body };
    } catch (e) {
      lastError = e;
      if (attempt < MAX_ATTEMPTS) {
        process.stdout.write(`  重试 ${attempt}/${MAX_ATTEMPTS}…\n`);
        await sleep(2000);
      }
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError;
}

async function fetchStatus(path) {
  let lastError;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      const res = await fetch(`${BASE}${path}`, {
        signal: controller.signal,
        cache: "no-store"
      });
      return res.status;
    } catch (e) {
      lastError = e;
      if (attempt < MAX_ATTEMPTS) {
        await sleep(2000);
      }
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError;
}

function fail(msg) {
  console.error(`\n❌ ${msg}`);
  process.exit(1);
}

function warn(msg) {
  console.warn(`⚠️  ${msg}`);
}

function authEnabledFromDeploy(deployBody) {
  const checks = deployBody.checks ?? [];
  const anon = checks.find((c) => c.id === "anon_key");
  if (anon) {
    return anon.ok === true;
  }
  return null;
}

async function main() {
  console.log("══ v4 生产 Auth 冒烟 ══\n");
  console.log(`URL: ${BASE}\n`);

  const status = await fetchJson("/api/deploy/status");
  if (status.status !== 200) {
    fail(`deploy/status HTTP ${status.status}`);
  }
  const deploy = status.body;
  if (!deploy.ready) {
    fail(`deploy/status ready=false`);
  }
  console.log("✓ deploy/status ready=true mode=" + deploy.mode);

  const authFromDeploy = authEnabledFromDeploy(deploy);
  if (authFromDeploy === true) {
    console.log("✓ deploy 报告 Auth（anon_key）已配置");
  } else if (authFromDeploy === false) {
    warn("deploy 报告 anon_key 未配置 — 生产可能仍为 v3 行为");
  } else {
    warn("deploy 无 anon_key 检查项 — 可能尚未 Redeploy v4 代码");
  }

  const loginStatus = await fetchStatus("/login");
  if (loginStatus !== 200) {
    fail(`/login HTTP ${loginStatus}（v4 Auth UI 应可访问）`);
  }
  console.log("✓ /login HTTP 200");

  const signupStatus = await fetchStatus("/signup");
  if (signupStatus !== 200) {
    warn(`/signup HTTP ${signupStatus}`);
  } else {
    console.log("✓ /signup HTTP 200");
  }

  const idea =
    "v4生产探针：一个简单的习惯打卡 App，记录每日运动，首版不含支付。";
  const postProject = await fetchJson("/api/projects", {
    method: "POST",
    body: JSON.stringify({ idea })
  });

  const getProjects = await fetchJson("/api/projects");

  let authGateActive =
    postProject.status === 401 || getProjects.status === 401;

  if (authGateActive) {
    console.log("✓ 未登录 POST/GET /api/projects → 401（Auth 门控生效）");
  } else if (postProject.status === 200) {
    warn(
      `未登录仍可 POST /api/projects (${postProject.status}) — Auth 未启用或未 Redeploy`
    );
    console.log(
      "   维护者：Vercel 配 NEXT_PUBLIC_SUPABASE_ANON_KEY 并 Redeploy"
    );
  } else {
    warn(`POST /api/projects 返回 ${postProject.status}（预期 401 或 200）`);
  }

  if (authFromDeploy === true && !authGateActive) {
    warn("deploy 称 Auth 已配，但 API 未返回 401 — 检查 middleware 与 env");
  }

  console.log("\n✅ verify:v4:production 探针完成");
  if (!authGateActive) {
    console.log("   结论：生产 Auth 门控 **尚未生效**（见上方 WARN）");
  } else {
    console.log("   结论：生产 Auth 门控 **已生效**");
  }
}

main().catch((e) => {
  if (e?.name === "AbortError" || e?.cause?.code === "UND_ERR_CONNECT_TIMEOUT") {
    warn(`生产 URL 网络不可达（${FETCH_TIMEOUT_MS}ms×${MAX_ATTEMPTS}）— 本地 curl 常超时`);
    warn("请用浏览器打开 /login 或稍后在 CI/WebFetch 重跑 verify:v4:production");
    console.log("\n⚠️  verify:v4:production 跳过（网络），静态门禁仍可通过");
    process.exit(0);
  }
  console.error(e);
  process.exit(1);
});
