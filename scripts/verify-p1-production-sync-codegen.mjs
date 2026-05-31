/**
 * P1：生产站同步 codegen 验收（默认枪战项目 · 鸿蒙，最快）
 * npm run verify:p1:production:sync
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
const TARGET = process.env.P1_TARGET?.trim() ?? "harmony";

async function main() {
  loadEnvLocal();
  if (process.env.V3_HTTP_PROXY?.trim()) {
    const p = process.env.V3_HTTP_PROXY.trim();
    process.env.HTTP_PROXY = process.env.HTTP_PROXY ?? p;
    process.env.HTTPS_PROXY = process.env.HTTPS_PROXY ?? p;
  }

  console.log("══ P1 生产同步 Codegen ══\n");
  console.log(`URL: ${BASE}`);
  console.log(`项目: ${PROJECT_ID}`);
  console.log(`栈: ${TARGET}\n`);

  if (!isAuthConfigured()) {
    console.error("❌ 缺少 Supabase / V4_TEST_*（.env.local）");
    process.exit(1);
  }

  const session = await createSessionCookieHeader();
  const cookieHeader = session.cookieHeader;
  console.log(`✓ 已登录 ${session.email}\n`);

  const t0 = Date.now();
  const started = await fetchJsonWithRetry(
    BASE,
    `/api/projects/${PROJECT_ID}/codegen/${TARGET}`,
    { method: "POST", cookieHeader, body: JSON.stringify({}) }
  );

  if (started.status !== 200 || !started.body?.success) {
    console.error(
      "❌ 同步生成失败:",
      started.status,
      JSON.stringify(started.body)
    );
    process.exit(1);
  }

  const body = started.body;
  if (body.mode !== "sync") {
    console.error(`❌ 期望 mode=sync，实际: ${body.mode}`);
    process.exit(1);
  }
  console.log(`✓ POST 返回 mode=sync runId=${body.runId}`);

  let status = body.status;
  let runId = body.runId;
  for (let i = 0; i < 40 && status !== "completed" && status !== "failed"; i++) {
    await sleep(2000);
    const row = await fetchJsonWithRetry(
      BASE,
      `/api/projects/${PROJECT_ID}/codegen/runs/${runId}`,
      { cookieHeader }
    );
    const r = row.body?.run ?? row.body ?? {};
    status = r.status ?? status;
    process.stdout.write(`  poll ${i + 1}: ${status}\n`);
  }

  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  if (status !== "completed") {
    console.error(`❌ 未在时限内 completed（${elapsed}s）status=${status}`);
    process.exit(1);
  }

  const final = await fetchJsonWithRetry(
    BASE,
    `/api/projects/${PROJECT_ID}/codegen/runs/${runId}`,
    { cookieHeader }
  );
  const run = final.body?.run ?? {};
  const downloadUrl = run.downloadUrl ?? run.download_url;
  if (!downloadUrl && !run.artifact_path) {
    console.error("❌ completed 但无 download/artifact");
    process.exit(1);
  }

  console.log(`✓ ${TARGET} codegen completed（${elapsed}s）`);
  if (downloadUrl) {
    console.log(`  download: ${BASE.replace(/\/$/, "")}${downloadUrl}`);
  }
  console.log("\n✅ verify:p1:production:sync 通过（P1 验收）\n");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
