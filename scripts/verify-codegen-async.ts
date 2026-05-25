/**
 * 异步 codegen E2E（需 3001 + inngest:dev:3001）
 * npm run verify:codegen:async -- <projectId> [flutter|wechat]
 */
import "../lib/load-env-local";

const BASE = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3001";
const projectId = process.argv[2]?.trim();
const target = (process.argv[3]?.trim() ?? "flutter") as "flutter" | "wechat";

async function sleep(ms: number) {
  await new Promise((r) => setTimeout(r, ms));
}

async function main() {
  if (!projectId) {
    console.error("用法: npm run verify:codegen:async -- <projectId> [flutter|wechat]");
    process.exit(1);
  }

  console.log("══ 异步 codegen E2E ══\n");
  console.log(`项目: ${projectId}`);
  console.log(`target: ${target}`);
  console.log(`base: ${BASE}\n`);

  const post = await fetch(`${BASE}/api/projects/${projectId}/codegen/${target}`, {
    method: "POST"
  });
  const body = (await post.json()) as {
    success?: boolean;
    runId?: string;
    error?: string;
  };

  if (!post.ok || !body.success || !body.runId) {
    console.error("❌ POST codegen 失败", post.status, body);
    process.exit(1);
  }

  const runId = body.runId;
  console.log(`runId: ${runId}`);

  for (let i = 1; i <= 48; i++) {
    await sleep(5000);
    const res = await fetch(
      `${BASE}/api/projects/${projectId}/codegen/runs/${runId}`,
      { cache: "no-store" }
    );
    const data = (await res.json()) as {
      run?: { status?: string; log?: string; metadata?: Record<string, unknown> };
      downloadUrl?: string | null;
      previewUrl?: string | null;
    };
    const status = data.run?.status ?? "?";
    console.log(`poll ${i}: ${status}`);

    if (status === "completed" || status === "failed") {
      console.log(JSON.stringify(data, null, 2));
      const ok =
        status === "completed" && !!data.downloadUrl && !!data.previewUrl;
      if (!ok) {
        console.error("\n❌ 异步 E2E 失败（缺 downloadUrl/previewUrl 或 status≠completed）");
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
