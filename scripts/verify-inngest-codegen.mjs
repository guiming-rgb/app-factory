/**
 * D1：Inngest codegen 就绪检查 + 可选 harmony 异步探针
 * npm run verify:inngest:codegen
 * npm run verify:inngest:codegen -- --async <projectId> harmony
 */
import { spawnSync } from "child_process";
import fs from "fs";
import path from "path";
import {
  createSessionCookieHeader,
  isAuthConfigured,
  loadEnvLocal
} from "./lib/production-auth.mjs";

const root = process.cwd();
const args = process.argv.slice(2);
const asyncIdx = args.indexOf("--async");
const doAsync = asyncIdx >= 0;
const projectId = doAsync ? args[asyncIdx + 1]?.trim() : "";
const target = doAsync ? args[asyncIdx + 2]?.trim() ?? "harmony" : "harmony";

const BASE =
  process.env.CODEGEN_E2E_BASE?.trim() ??
  process.env.NEXT_PUBLIC_APP_URL?.trim() ??
  "http://localhost:3001";

const REQUIRED_FUNCTIONS = [
  "codegen-flutter",
  "codegen-wechat",
  "codegen-harmony",
  "generate-project-report"
];

function checkStatic() {
  console.log("══ Inngest codegen 静态 ══\n");
  const fnFile = path.join(root, "lib/inngest/codegen-functions.ts");
  const text = fs.readFileSync(fnFile, "utf8");
  for (const id of REQUIRED_FUNCTIONS.slice(0, 3)) {
    if (!text.includes(`id: "${id}"`)) {
      console.error(`❌ 缺少 Inngest 函数 ${id}`);
      process.exit(1);
    }
    console.log(`✓ ${id}`);
  }
  if (!fs.existsSync(path.join(root, "lib/codegen/inngest-preflight.ts"))) {
    console.error("❌ 缺少 inngest-preflight.ts");
    process.exit(1);
  }
  console.log("✓ inngest-preflight");
}

async function probeDevUi() {
  console.log("\n══ Inngest Dev (8288) ══\n");
  try {
    const res = await fetch("http://127.0.0.1:8288/", {
      signal: AbortSignal.timeout(3000)
    });
    if (!res.ok) {
      console.warn("⚠ 8288 响应异常", res.status);
      return false;
    }
    console.log("✓ Inngest Dev UI 可达");
    return true;
  } catch {
    console.warn("⚠ Inngest Dev 未启动 — 本地后台队列不可用");
    console.warn("   运行：npm run dev:codegen:3001");
    return false;
  }
}

async function probeDeployStatus() {
  console.log("\n══ /api/deploy/status ══\n");
  try {
    const res = await fetch(`${BASE.replace(/\/$/, "")}/api/deploy/status`, {
      signal: AbortSignal.timeout(8000)
    });
    if (!res.ok) {
      console.warn("⚠ deploy/status", res.status);
      return;
    }
    const data = await res.json();
    console.log(`mode: ${data.mode}`);
    for (const c of data.checks ?? []) {
      console.log(`${c.ok ? "✓" : "✗"} ${c.label}: ${c.detail}`);
    }
  } catch (e) {
    console.warn("⚠ 无法访问 deploy/status:", e instanceof Error ? e.message : e);
  }
}

async function runAsyncProbe() {
  if (!doAsync || !projectId) return;
  console.log("\n══ harmony 异步探针 ══\n");
  const r = spawnSync(
    "node",
    ["scripts/verify-codegen-async.mjs", projectId, target],
    {
      cwd: root,
      encoding: "utf8",
      env: {
        ...process.env,
        CODEGEN_E2E_BASE: BASE
      },
      timeout: 360000
    }
  );
  process.stdout.write(r.stdout ?? "");
  process.stderr.write(r.stderr ?? "");
  if (r.status !== 0) process.exit(r.status ?? 1);
}

async function main() {
  loadEnvLocal();
  checkStatic();
  await probeDevUi();
  await probeDeployStatus();
  if (doAsync) {
    if (!isAuthConfigured()) {
      console.error("❌ 异步探针需 Supabase Auth + V4_TEST_*");
      process.exit(1);
    }
    await createSessionCookieHeader();
    await runAsyncProbe();
  } else {
    console.log("\n可选全链路：npm run verify:inngest:codegen -- --async <projectId> harmony");
  }
  console.log("\n✅ verify:inngest:codegen 通过");
}

main().catch((e) => {
  console.error("❌", e instanceof Error ? e.message : e);
  process.exit(1);
});
