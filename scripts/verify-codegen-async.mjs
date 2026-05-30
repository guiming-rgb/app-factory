/**
 * 异步 codegen E2E（Auth Cookie + 可选 Inngest 探针）
 *
 * 本地：npm run start -- -p 3001 && npm run inngest:dev:3001
 * npm run verify:codegen:async -- <projectId> [flutter|wechat|harmony]
 *
 * 生产：
 * CODEGEN_E2E_BASE=https://app-factory-five.vercel.app npm run verify:codegen:async -- <projectId> harmony
 */
import {
  createSessionCookieHeader,
  isAuthConfigured,
  loadEnvLocal
} from "./lib/production-auth.mjs";

const BASE =
  process.env.CODEGEN_E2E_BASE?.trim() ??
  process.env.NEXT_PUBLIC_APP_URL?.trim() ??
  "http://localhost:3001";
const projectId = process.argv[2]?.trim();
const target = process.argv[3]?.trim() ?? "flutter";

async function sleep(ms) {
  await new Promise((r) => setTimeout(r, ms));
}

function authHeaders(cookieHeader) {
  return cookieHeader ? { Cookie: cookieHeader } : {};
}

async function main() {
  loadEnvLocal();

  if (!projectId) {
    console.error(
      "用法: npm run verify:codegen:async -- <projectId> [flutter|wechat|harmony]"
    );
    process.exit(1);
  }

  const validTargets = ["flutter", "wechat", "harmony"];
  if (!validTargets.includes(target)) {
    console.error(`❌ 未知 target: ${target}（flutter|wechat|harmony）`);
    process.exit(1);
  }

  console.log("══ 异步 codegen E2E（Auth Cookie）══\n");
  console.log(`项目: ${projectId}`);
  console.log(`target: ${target}`);
  console.log(`base: ${BASE}\n`);

  if (!isAuthConfigured()) {
    console.error("❌ 缺少 NEXT_PUBLIC_SUPABASE_URL / ANON_KEY");
    process.exit(1);
  }

  const isLocal = /localhost|127\.0\.0\.1/.test(BASE);
  if (isLocal) {
    try {
      const inngestProbe = await fetch("http://127.0.0.1:8288/", {
        signal: AbortSignal.timeout(3000)
      }).catch(() => null);
      if (!inngestProbe?.ok) {
        console.warn(
          "⚠️  Inngest Dev (8288) 未响应 — 异步 codegen 可能卡在 queued"
        );
        console.warn("   请先：npm run inngest:dev:3001\n");
      } else {
        console.log("✓ Inngest Dev 已响应 (8288)\n");
      }
    } catch {
      console.warn("⚠️  无法探测 Inngest Dev\n");
    }
  }

  let cookieHeader;
  try {
    const session = await createSessionCookieHeader();
    cookieHeader = session.cookieHeader;
    console.log(`✓ 测试账号已登录 (${session.email})\n`);
  } catch (e) {
    console.error(
      "❌",
      e instanceof Error ? e.message : e,
      "\n   需在 .env.local 配置 V4_TEST_EMAIL / V4_TEST_PASSWORD"
    );
    process.exit(1);
  }

  const post = await fetch(`${BASE}/api/projects/${projectId}/codegen/${target}`, {
    method: "POST",
    headers: authHeaders(cookieHeader)
  });

  const raw = await post.text();
  let body;
  try {
    body = JSON.parse(raw);
  } catch {
    console.error("❌ POST 返回非 JSON", post.status, raw.slice(0, 200));
    if (post.status === 404 && target === "harmony") {
      console.error(
        "   提示：本地 404 多为旧进程未含 /codegen/harmony — 请重启 npm run start"
      );
    }
    process.exit(1);
  }

  if (!post.ok || !body.success || !body.runId) {
    console.error("❌ POST codegen 失败", post.status, body);
    process.exit(1);
  }

  const runId = body.runId;
  console.log(`runId: ${runId}`);

  const maxPolls = isLocal ? 48 : 60;
  for (let i = 1; i <= maxPolls; i++) {
    await sleep(5000);
    const res = await fetch(
      `${BASE}/api/projects/${projectId}/codegen/runs/${runId}`,
      { cache: "no-store", headers: authHeaders(cookieHeader) }
    );
    const data = await res.json();
    const status = data.run?.status ?? "?";
    const meta = data.run?.metadata ?? {};
    const extra =
      typeof meta.specQualityScore === "number"
        ? ` · Spec ${meta.specQualityScore}`
        : "";
    console.log(`poll ${i}: ${status}${extra}`);

    if (status === "completed" || status === "failed") {
      console.log(JSON.stringify(data, null, 2));
      const ok =
        status === "completed" && !!data.downloadUrl && !!data.previewUrl;
      if (!ok) {
        console.error(
          "\n❌ 异步 E2E 失败（缺 downloadUrl/previewUrl 或 status≠completed）"
        );
        process.exit(1);
      }
      console.log("\n✅ verify:codegen:async 通过");
      return;
    }
  }

  console.error("\n❌ 轮询超时");
  process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
