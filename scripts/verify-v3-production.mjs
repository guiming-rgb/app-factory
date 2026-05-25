/**
 * v3 生产环境验收（Vercel + Inngest Cloud + Supabase）
 * npm run verify:v3:production
 */
const BASE =
  process.env.V3_PRODUCTION_URL?.trim() ??
  "https://app-factory-five.vercel.app";

const FETCH_TIMEOUT_MS = 60_000;

const POLL_MS = 8000;
const GENERATE_MAX = 90;
const CODEGEN_MAX = 36;

async function sleep(ms) {
  await new Promise((r) => setTimeout(r, ms));
}

async function json(path, init) {
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
  } finally {
    clearTimeout(timer);
  }
}

function fail(msg) {
  console.error(`\n❌ ${msg}`);
  process.exit(1);
}

async function main() {
  console.log("══ v3 生产环境验收 ══\n");
  console.log(`URL: ${BASE}\n`);

  const status = await json("/api/deploy/status");
  if (status.status !== 200) fail(`deploy/status HTTP ${status.status}`);
  const deploy = status.body;
  if (!deploy.ready) {
    fail(`deploy/status ready=false: ${JSON.stringify(deploy)}`);
  }
  console.log("✓ /api/deploy/status ready=true mode=" + deploy.mode);

  const home = await fetch(`${BASE}/`, { cache: "no-store" });
  if (!home.ok) fail(`首页 HTTP ${home.status}`);
  console.log("✓ 首页 HTTP 200");

  const idea =
    "v3验收：做一个简单的待办清单小程序，支持添加删除任务，首版不含登录。";
  const created = await json("/api/projects", {
    method: "POST",
    body: JSON.stringify({ idea })
  });
  if (created.status !== 200) {
    fail(`创建项目失败: ${created.status} ${JSON.stringify(created.body)}`);
  }
  const project = created.body.project ?? {};
  const projectId = project.id;
  if (!projectId) fail("创建项目无 id");
  console.log(`✓ 创建项目 ${projectId} (${project.title ?? "—"})`);

  const gen = await json(`/api/projects/${projectId}/generate`, {
    method: "POST",
    body: JSON.stringify({})
  });
  if (gen.status !== 200 || !gen.body.success) {
    fail(`generate 失败: ${gen.status} ${JSON.stringify(gen.body)}`);
  }
  console.log(`✓ generate 已投递 mode=${gen.body.mode ?? "?"}`);

  let completed = false;
  for (let i = 1; i <= GENERATE_MAX; i++) {
    await sleep(POLL_MS);
    const row = await json(`/api/projects/${projectId}`);
    const p = row.body.project ?? row.body;
    const st = p.status ?? "?";
    process.stdout.write(`  generate poll ${i}: ${st}\n`);
    if (st === "completed") {
      completed = true;
      break;
    }
    if (st === "failed") {
      fail(`generate failed: ${JSON.stringify(row.body)}`);
    }
  }
  if (!completed) fail("generate 轮询超时");

  const detail = await json(`/api/projects/${projectId}`);
  const proj = detail.body.project ?? detail.body;
  const reportLen = proj.final_report?.length ?? 0;
  if (reportLen < 100) fail(`final_report 过短: ${reportLen}`);
  console.log(`✓ 方案生成 completed · report ${reportLen} chars`);

  const cg = await json(`/api/projects/${projectId}/codegen/wechat`, {
    method: "POST"
  });
  if (cg.status !== 200 || !cg.body.success) {
    fail(`codegen/wechat 失败: ${cg.status} ${JSON.stringify(cg.body)}`);
  }
  const runId = cg.body.runId;
  if (!runId) fail("无 runId");
  console.log(`✓ wechat codegen 已投递 runId=${runId}`);

  let cgOk = false;
  for (let i = 1; i <= CODEGEN_MAX; i++) {
    await sleep(POLL_MS);
    const run = await json(
      `/api/projects/${projectId}/codegen/runs/${runId}`
    );
    const r = run.body.run ?? {};
    const st = r.status ?? "?";
    process.stdout.write(`  codegen poll ${i}: ${st}\n`);
    if (st === "completed") {
      const previewUrl = run.body.previewUrl;
      const downloadUrl = run.body.downloadUrl;
      const buildStatus = r.metadata?.buildStatus;
      if (!downloadUrl) fail("completed 但无 downloadUrl");
      if (!previewUrl) fail("completed 但无 previewUrl");
      console.log(`✓ wechat codegen completed buildStatus=${buildStatus}`);
      console.log(`  download: ${downloadUrl}`);
      console.log(`  preview:  ${previewUrl}`);
      cgOk = true;
      break;
    }
    if (st === "failed") {
      fail(`codegen failed: ${JSON.stringify(run.body)}`);
    }
  }
  if (!cgOk) fail("codegen 轮询超时");

  console.log("\n✅ verify:v3:production 通过");
  console.log(`   样本项目: ${projectId}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
