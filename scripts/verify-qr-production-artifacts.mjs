/**
 * Q3：生产枪战项目 ZIP 内容探针（需先跑 P1 或已有 completed run）
 * npm run verify:qr:production:artifacts
 */
import AdmZip from "adm-zip";
import fs from "fs";
import path from "path";
import { applyEnvLocal } from "./lib/load-env-local.mjs";
import {
  createSessionCookieHeader,
  isAuthConfigured
} from "./lib/production-auth.mjs";
import {
  configureFetchProxyFromEnv,
  fetchJsonWithRetry
} from "./lib/full-chain-probe.mjs";

const BASE =
  process.env.V3_PRODUCTION_URL?.trim() ??
  "https://app-factory-five.vercel.app";
const PROJECT_ID =
  process.env.P1_PROJECT_ID?.trim() ??
  "0ea7a53c-a645-4ad9-a43a-02263f9b7b4a";

const CHECKS = {
  harmony: [
    /EntityDetail\.ets$/,
    /entry\/src\/main\/ets\/pages\/Index\.ets$/
  ],
  flutter: [/macos\//, /windows\//]
};

async function latestCompletedRun(target, cookieHeader) {
  const list = await fetchJsonWithRetry(
    BASE,
    `/api/projects/${PROJECT_ID}/codegen/runs`,
    { cookieHeader }
  );
  if (list.status !== 200) {
    throw new Error(`runs 列表 HTTP ${list.status}`);
  }
  const runs = list.body?.runs ?? [];
  const hit = runs.find(
    (r) => r.target === target && r.status === "completed"
  );
  if (!hit?.id) {
    throw new Error(`${target} 无 completed run，请先 npm run verify:p1:production:sync`);
  }
  return hit.id;
}

async function downloadZip(runId, cookieHeader, outPath) {
  configureFetchProxyFromEnv();
  const url = `${BASE.replace(/\/$/, "")}/api/projects/${PROJECT_ID}/codegen/runs/${runId}/download`;
  const res = await fetch(url, {
    headers: { Cookie: cookieHeader },
    cache: "no-store"
  });
  if (!res.ok) {
    throw new Error(`下载 HTTP ${res.status}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, buf);
  return buf.length;
}

function zipMatches(buf, patterns) {
  const zip = new AdmZip(buf);
  const names = zip.getEntries().map((e) => e.entryName.replace(/\\/g, "/"));
  const missing = [];
  for (const pat of patterns) {
    if (!names.some((n) => pat.test(n))) {
      missing.push(String(pat));
    }
  }
  return { ok: missing.length === 0, missing, sample: names.slice(0, 8) };
}

async function main() {
  applyEnvLocal();
  console.log("══ Q3 生产 ZIP 内容探针 ══\n");
  console.log(`项目: ${PROJECT_ID}\n`);

  if (!isAuthConfigured()) {
    console.error("❌ 缺少 Supabase / V4_TEST_*");
    process.exit(1);
  }

  const session = await createSessionCookieHeader();
  const tmp = path.join("/tmp", `qr-artifacts-${Date.now()}`);

  for (const target of ["harmony", "flutter"]) {
    const runId = await latestCompletedRun(target, session.cookieHeader);
    const zipPath = path.join(tmp, `${target}.zip`);
    const bytes = await downloadZip(runId, session.cookieHeader, zipPath);
    const buf = fs.readFileSync(zipPath);
    const { ok, missing } = zipMatches(buf, CHECKS[target]);
    if (!ok) {
      console.error(`❌ ${target} ZIP 缺: ${missing.join(", ")}`);
      process.exit(1);
    }
    console.log(`✓ ${target} ZIP ${bytes} bytes · runId=${runId}`);
    for (const pat of CHECKS[target]) {
      console.log(`  含 ${pat}`);
    }
  }

  console.log("\n✅ verify:qr:production:artifacts 通过\n");
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
