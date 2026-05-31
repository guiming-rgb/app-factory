/**
 * P1：生产站同步 codegen 验收
 * npm run verify:p1:production:sync          # 默认 harmony
 * npm run verify:p1:production:sync:all        # harmony + wechat + flutter
 * P1_TARGETS=wechat npm run verify:p1:production:sync
 */
import {
  createSessionCookieHeader,
  isAuthConfigured,
  loadEnvLocal
} from "./lib/production-auth.mjs";
import { fetchJsonWithRetry, sleep } from "./lib/full-chain-probe.mjs";

const BASE =
  process.env.V3_PRODUCTION_URL?.trim() ??
  "https://app-factory-five.vercel.app";
const PROJECT_ID =
  process.env.P1_PROJECT_ID?.trim() ??
  "0ea7a53c-a645-4ad9-a43a-02263f9b7b4a";

const ALL_TARGETS = ["harmony", "wechat", "flutter"];
const TARGETS = (process.env.P1_TARGETS?.trim() || process.env.P1_TARGET?.trim() || "harmony")
  .split(",")
  .map((t) => t.trim())
  .filter(Boolean);

const POLL_MAX_BY_TARGET = {
  harmony: 40,
  flutter: 90,
  wechat: 150
};

async function runOneTarget(target, cookieHeader) {
  console.log(`── ${target} ──\n`);
  const t0 = Date.now();
  const started = await fetchJsonWithRetry(
    BASE,
    `/api/projects/${PROJECT_ID}/codegen/${target}`,
    { method: "POST", cookieHeader, body: JSON.stringify({}) }
  );

  if (started.status !== 200 || !started.body?.success) {
    throw new Error(
      `${target} 同步失败 ${started.status}: ${JSON.stringify(started.body)}`
    );
  }

  const body = started.body;
  if (body.mode !== "sync") {
    throw new Error(`${target} 期望 mode=sync，实际: ${body.mode}`);
  }
  console.log(`✓ ${target} POST mode=sync runId=${body.runId}`);

  let status = body.status;
  const runId = body.runId;
  const pollMax = POLL_MAX_BY_TARGET[target] ?? 60;

  for (let i = 0; i < pollMax && status !== "completed" && status !== "failed"; i++) {
    await sleep(2000);
    const row = await fetchJsonWithRetry(
      BASE,
      `/api/projects/${PROJECT_ID}/codegen/runs/${runId}`,
      { cookieHeader }
    );
    const r = row.body?.run ?? row.body ?? {};
    status = r.status ?? status;
    process.stdout.write(`  ${target} poll ${i + 1}: ${status}\n`);
  }

  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  if (status !== "completed") {
    throw new Error(`${target} 未完成（${elapsed}s）status=${status}`);
  }

  const final = await fetchJsonWithRetry(
    BASE,
    `/api/projects/${PROJECT_ID}/codegen/runs/${runId}`,
    { cookieHeader }
  );
  const run = final.body?.run ?? {};
  const downloadUrl = run.downloadUrl ?? run.download_url;
  if (!downloadUrl && !run.artifact_path) {
    throw new Error(`${target} completed 但无 download/artifact`);
  }

  console.log(`✓ ${target} completed（${elapsed}s）`);
  if (downloadUrl) {
    console.log(`  download: ${BASE.replace(/\/$/, "")}${downloadUrl}\n`);
  }
  return { target, runId, elapsed };
}

async function main() {
  loadEnvLocal();
  if (process.env.V3_HTTP_PROXY?.trim()) {
    const p = process.env.V3_HTTP_PROXY.trim();
    process.env.HTTP_PROXY = process.env.HTTP_PROXY ?? p;
    process.env.HTTPS_PROXY = process.env.HTTPS_PROXY ?? p;
  }

  const invalid = TARGETS.filter((t) => !ALL_TARGETS.includes(t));
  if (invalid.length) {
    console.error(`❌ 未知 P1_TARGETS: ${invalid.join(", ")}`);
    process.exit(1);
  }

  console.log("══ P1 生产同步 Codegen ══\n");
  console.log(`URL: ${BASE}`);
  console.log(`项目: ${PROJECT_ID}`);
  console.log(`栈: ${TARGETS.join(", ")}\n`);

  if (!isAuthConfigured()) {
    console.error("❌ 缺少 Supabase / V4_TEST_*（.env.local）");
    process.exit(1);
  }

  const session = await createSessionCookieHeader();
  console.log(`✓ 已登录 ${session.email}\n`);

  const results = [];
  for (const target of TARGETS) {
    results.push(await runOneTarget(target, session.cookieHeader));
  }

  console.log("✅ verify:p1:production:sync 通过");
  for (const r of results) {
    console.log(`   ${r.target}: ${r.elapsed}s · ${r.runId}`);
  }
  console.log("");
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
