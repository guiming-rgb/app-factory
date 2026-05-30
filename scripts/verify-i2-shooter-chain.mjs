/**
 * I2：枪战项目 8/8 后三栈同步 codegen + 实体列表抽样
 *
 * npm run verify:i2:shooter -- <projectId>
 * npm run verify:i2:shooter -- --create-shooter   # 含 trigger 8/8
 */
import { spawnSync } from "child_process";
import AdmZip from "adm-zip";
import {
  createSessionCookieHeader,
  isAuthConfigured,
  loadEnvLocal
} from "./lib/production-auth.mjs";
import { fetchJsonWithRetry, sleep } from "./lib/full-chain-probe.mjs";

const TARGETS = ["wechat", "flutter", "harmony"];

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
  let createShooter = false;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--base" && args[i + 1]) base = args[++i];
    else if (args[i] === "--create-shooter") createShooter = true;
    else if (!args[i].startsWith("-")) projectId = args[i];
  }
  return { base, projectId, createShooter };
}

async function pollCodegen(base, cookieHeader, projectId, target, runId) {
  for (let i = 1; i <= 24; i++) {
    await sleep(5000);
    const run = await fetchJsonWithRetry(
      base,
      `/api/projects/${projectId}/codegen/runs/${runId}`,
      { cookieHeader }
    );
    const st = run.body.run?.status ?? "?";
    process.stdout.write(`  ${target} poll ${i}: ${st}\n`);
    if (st === "completed") return run.body;
    if (st === "failed") {
      fail(`${target} codegen failed: ${JSON.stringify(run.body)}`);
    }
  }
  fail(`${target} codegen 超时`);
}

function checkWechatZip(buf) {
  const zip = new AdmZip(buf);
  const wxml = zip
    .getEntries()
    .find((e) => e.entryName.endsWith("pages/index/index.wxml") || e.entryName.includes("match_list"));
  if (!wxml) fail("wechat zip 无列表页 wxml");
  const text = wxml.getData().toString("utf8");
  if (!text.includes("wx:for")) fail("wechat 列表无 wx:for");
  console.log("  ✓ wechat 对战列表");
}

function checkFlutterZip(buf) {
  const zip = new AdmZip(buf);
  const dart = zip
    .getEntries()
    .find((e) => e.entryName.includes("list_page.dart") || e.entryName.includes("match_list"));
  if (!dart) fail("flutter zip 无 list_page");
  const text = dart.getData().toString("utf8");
  if (!text.includes("ListView")) fail("flutter 无 ListView");
  console.log("  ✓ flutter match_list");
}

function checkHarmonyZip(buf) {
  const zip = new AdmZip(buf);
  const ets = zip.getEntries().find((e) => e.entryName.endsWith("Index.ets"));
  if (!ets) fail("harmony zip 无 Index.ets");
  const text = ets.getData().toString("utf8");
  if (!text.includes("ForEach")) fail("harmony 无 ForEach 列表");
  console.log("  ✓ harmony 列表");
}

async function downloadZip(url, cookieHeader) {
  const res = await fetch(url, {
    headers: cookieHeader ? { Cookie: cookieHeader } : undefined,
    cache: "no-store"
  });
  if (!res.ok) fail(`下载失败 HTTP ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

async function main() {
  loadEnvLocal();
  const { base, projectId: argId, createShooter } = parseArgs(process.argv);

  console.log("══ I2 枪战三栈抽样 ══\n");

  let projectId = argId;
  if (createShooter || !projectId) {
    const trig = spawnSync(
      "node",
      ["scripts/trigger-project-generate.mjs", ...(createShooter ? ["--create-shooter"] : [])],
      { cwd: process.cwd(), encoding: "utf8", env: { ...process.env, TRIGGER_BASE: base } }
    );
    if (trig.status !== 0) process.exit(trig.status ?? 1);
    const idLine = trig.stdout.split("\n").find((l) => l.startsWith("PROJECT_ID="));
    projectId = idLine?.slice("PROJECT_ID=".length).trim() ?? null;
    if (!projectId) fail("未能从 trigger 输出解析 projectId");
    console.log(`\n使用项目 ${projectId}\n`);
  }

  if (!projectId) fail("缺少 projectId");

  let cookieHeader = null;
  if (isAuthConfigured()) {
    const session = await createSessionCookieHeader();
    cookieHeader = session.cookieHeader;
  }

  const detail = await fetchJsonWithRetry(base, `/api/projects/${projectId}`, {
    cookieHeader
  });
  const st = detail.body.project?.status ?? detail.body.status;
  if (st !== "completed") {
    fail(`项目未 completed（${st}），请先 npm run trigger:shooter:8-8`);
  }
  console.log(`✓ 项目 completed\n`);

  for (const target of TARGETS) {
    console.log(`── ${target} 同步 codegen ──`);
    const cg = await fetchJsonWithRetry(
      base,
      `/api/projects/${projectId}/codegen/${target}`,
      { method: "POST", cookieHeader }
    );
    if (cg.status !== 200 || !cg.body.success) {
      fail(`${target}: ${cg.status} ${JSON.stringify(cg.body)}`);
    }
    const runId = cg.body.runId;
    const done = await pollCodegen(base, cookieHeader, projectId, target, runId);
    const url = done.downloadUrl;
    if (!url) fail(`${target} 无 downloadUrl`);
    const buf = await downloadZip(url.startsWith("http") ? url : `${base}${url}`, cookieHeader);
    if (target === "wechat") checkWechatZip(buf);
    else if (target === "flutter") checkFlutterZip(buf);
    else checkHarmonyZip(buf);
    console.log("");
  }

  const local = spawnSync("npm", ["run", "verify:h4:shooter"], {
    stdio: "inherit",
    encoding: "utf8"
  });
  if (local.status !== 0) process.exit(local.status ?? 1);

  console.log("\n✅ verify:i2:shooter 通过（8/8 + 三栈 ZIP 含对战列表）");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
