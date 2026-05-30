/**
 * 对已有项目触发 8 Agent 生成并轮询至 completed（本地或生产）
 *
 * npm run trigger:generate -- <projectId>
 * npm run trigger:generate -- <projectId> --base https://app-factory-five.vercel.app
 * npm run trigger:generate -- --create-shooter   # 本地无枪战项目时创建并跑满
 */
import {
  createSessionCookieHeader,
  isAuthConfigured,
  loadEnvLocal
} from "./lib/production-auth.mjs";
import {
  fetchJsonWithRetry,
  isNetworkError,
  sleep
} from "./lib/full-chain-probe.mjs";

const SHOOTER_ID = "0ea7a53c-a645-4ad9-a43a-02263f9b7b4a";
const SHOOTER_IDEA =
  "少年枪战 App：对战列表 + 我的两个 Tab。首版不含联网对战，最多 20 人、5 种枪、2 张地图。列表展示 Match（标题、地图名）。";

const POLL_MS = 8000;
const GENERATE_MAX = 120;

function fail(msg) {
  console.error(`\n❌ ${msg}`);
  process.exit(1);
}

function parseArgs(argv) {
  const args = argv.slice(2);
  let base =
    process.env.TRIGGER_BASE?.trim() ??
    process.env.NEXT_PUBLIC_APP_URL?.trim() ??
    "http://localhost:3001";
  let projectId = null;
  let force = false;
  let createShooter = false;

  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--base" && args[i + 1]) {
      base = args[++i];
    } else if (a === "--force") {
      force = true;
    } else if (a === "--create-shooter") {
      createShooter = true;
    } else if (!a.startsWith("-")) {
      projectId = a;
    }
  }

  if (createShooter) projectId = null;
  return { base, projectId, force, createShooter };
}

async function ensureCookie() {
  if (!isAuthConfigured()) {
    return { cookieHeader: null };
  }
  return createSessionCookieHeader();
}

async function createProject(base, cookieHeader, idea) {
  const created = await fetchJsonWithRetry(base, "/api/projects", {
    method: "POST",
    cookieHeader,
    body: JSON.stringify({ idea })
  });
  if (created.status !== 200) {
    fail(`创建项目失败: ${created.status} ${JSON.stringify(created.body)}`);
  }
  const projectId = created.body.project?.id;
  if (!projectId) fail("创建项目无 id");
  console.log(`✓ 创建项目 ${projectId} (${created.body.project?.title ?? "—"})`);
  return projectId;
}

async function triggerGenerate(base, cookieHeader, projectId, force) {
  const gen = await fetchJsonWithRetry(
    base,
    `/api/projects/${projectId}/generate`,
    {
      method: "POST",
      cookieHeader,
      body: JSON.stringify({ forceRegenerate: force })
    }
  );
  if (gen.status === 409) {
    console.log("ℹ️  项目已在生成中，继续轮询…");
    return;
  }
  if (gen.status !== 200 || !gen.body.success) {
    fail(`generate 失败: ${gen.status} ${JSON.stringify(gen.body)}`);
  }
  console.log(`✓ generate 已投递 (${gen.body.message ?? gen.body.mode ?? "async"})`);
}

async function pollUntilCompleted(base, cookieHeader, projectId) {
  for (let i = 1; i <= GENERATE_MAX; i++) {
    await sleep(POLL_MS);
    const row = await fetchJsonWithRetry(base, `/api/projects/${projectId}`, {
      cookieHeader
    });
    if (row.status === 404) {
      fail(`项目不存在: ${projectId}`);
    }
    const p = row.body.project ?? row.body;
    const st = p.status ?? "?";
    const runs = p.agent_runs?.length ?? p.completed_agents ?? "?";
    process.stdout.write(`  poll ${i}: status=${st} agents=${runs}\n`);
    if (st === "completed") {
      const reportLen = p.final_report?.length ?? 0;
      if (reportLen < 100) {
        fail(`completed 但 final_report 过短 (${reportLen})`);
      }
      console.log(`✓ 8/8 完成 · report ${reportLen} chars`);
      return p;
    }
    if (st === "failed") {
      fail(`generate failed: ${p.error_message ?? JSON.stringify(row.body)}`);
    }
  }
  fail("generate 轮询超时（约 " + (GENERATE_MAX * POLL_MS) / 60000 + " 分钟）");
}

async function main() {
  loadEnvLocal();
  const { base, projectId: argId, force, createShooter } = parseArgs(process.argv);

  console.log("══ 触发项目 8 Agent 生成 ══\n");
  console.log(`BASE: ${base}\n`);

  let cookieHeader = null;
  try {
    const session = await ensureCookie();
    cookieHeader = session.cookieHeader;
    if (session.email) console.log(`✓ 已登录 ${session.email}\n`);
  } catch (e) {
    fail(e instanceof Error ? e.message : String(e));
  }

  let projectId = argId;

  if (createShooter || !projectId) {
    if (!createShooter && projectId === SHOOTER_ID) {
      // 生产 ID 在本地库可能不存在，回退创建
      const probe = await fetchJsonWithRetry(base, `/api/projects/${SHOOTER_ID}`, {
        cookieHeader
      }).catch((e) => ({ status: 0, body: {}, ok: false, _err: e }));
      if (probe.status === 404 || probe.status === 0) {
        console.log("ℹ️  枪战生产 ID 在本地不存在，创建本地枪战样本…\n");
        projectId = await createProject(base, cookieHeader, SHOOTER_IDEA);
      } else if (probe.status === 200) {
        projectId = SHOOTER_ID;
        const st = probe.body.project?.status ?? probe.body.status;
        console.log(`✓ 使用已有枪战项目 ${projectId} (status=${st})\n`);
      } else {
        fail(`探测枪战项目失败: ${probe.status}`);
      }
    } else if (createShooter) {
      projectId = await createProject(base, cookieHeader, SHOOTER_IDEA);
    }
  }

  if (!projectId) fail("缺少 projectId");

  const before = await fetchJsonWithRetry(base, `/api/projects/${projectId}`, {
    cookieHeader
  });
  if (before.status === 404) {
    if (projectId === SHOOTER_ID) {
      console.log("ℹ️  生产枪战 ID 不可达，改创建本地枪战项目…\n");
      projectId = await createProject(base, cookieHeader, SHOOTER_IDEA);
    } else {
      fail(`项目不存在: ${projectId}`);
    }
  } else if (before.status !== 200) {
    fail(`读取项目失败: ${before.status}`);
  } else {
    const st = before.body.project?.status ?? before.body.status;
    console.log(`项目 ${projectId} · 当前 status=${st}\n`);
    if (st === "completed" && !force) {
      console.log("✓ 已是 completed，跳过 generate（加 --force 可重跑）");
      console.log(`PROJECT_ID=${projectId}`);
      process.exit(0);
    }
  }

  await triggerGenerate(base, cookieHeader, projectId, force);
  await pollUntilCompleted(base, cookieHeader, projectId);
  console.log(`\n项目 ID: ${projectId}`);
  console.log(`PROJECT_ID=${projectId}`);
  console.log(`详情: ${base.replace(/\/$/, "")}/projects/${projectId}`);
}

main().catch((e) => {
  if (isNetworkError(e)) {
    fail(
      `${parseArgs(process.argv).base} 不可达 — 本地请 start:3001 + inngest:dev:3001`
    );
  }
  console.error(e);
  process.exit(1);
});
