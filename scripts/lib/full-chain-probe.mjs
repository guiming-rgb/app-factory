/**
 * 共享：生产/本地 HTTP 探针 + 可选 Auth Cookie
 */
const DEFAULT_TIMEOUT_MS = Math.max(
  30_000,
  Number(process.env.V3_PROBE_TIMEOUT_MS) || 60_000
);
const DEFAULT_RETRIES = 3;

export async function sleep(ms) {
  await new Promise((r) => setTimeout(r, ms));
}

/**
 * @param {string} base
 * @param {string} path
 * @param {RequestInit & { cookieHeader?: string | null }} [init]
 */
export async function fetchJsonWithRetry(base, path, init = {}) {
  const { cookieHeader, headers, ...rest } = init;
  let lastError;

  for (let attempt = 1; attempt <= DEFAULT_RETRIES; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
    try {
      const res = await fetch(`${base.replace(/\/$/, "")}${path}`, {
        ...rest,
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          ...(cookieHeader ? { Cookie: cookieHeader } : {}),
          ...(headers ?? {})
        },
        cache: "no-store"
      });
      let body = {};
      try {
        body = await res.json();
      } catch {
        body = {};
      }
      return { status: res.status, body, ok: res.ok };
    } catch (e) {
      lastError = e;
      if (attempt < DEFAULT_RETRIES) {
        process.stdout.write(`  重试 ${attempt}/${DEFAULT_RETRIES}…\n`);
        await sleep(2000);
      }
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError;
}

/**
 * @param {string} base
 * @param {string} path
 * @param {{ cookieHeader?: string | null }} [opts]
 */
export async function fetchStatusWithRetry(base, path, opts = {}) {
  let lastError;
  for (let attempt = 1; attempt <= DEFAULT_RETRIES; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
    try {
      const res = await fetch(`${base.replace(/\/$/, "")}${path}`, {
        signal: controller.signal,
        cache: "no-store",
        headers: opts.cookieHeader ? { Cookie: opts.cookieHeader } : undefined
      });
      return res.status;
    } catch (e) {
      lastError = e;
      if (attempt < DEFAULT_RETRIES) {
        await sleep(2000);
      }
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError;
}

export function isNetworkError(err) {
  return (
    err?.name === "AbortError" ||
    err?.cause?.code === "UND_ERR_CONNECT_TIMEOUT" ||
    err?.code === "ECONNREFUSED" ||
    err?.code === "ENOTFOUND"
  );
}

/**
 * 发版全链路：创建 → generate → wechat codegen
 * @param {object} opts
 * @param {string} opts.base
 * @param {string | null} opts.cookieHeader
 * @param {string} [opts.ideaPrefix]
 */
export async function runFullChainProbe(opts) {
  const { base, cookieHeader, ideaPrefix = "S6验收" } = opts;

  const POLL_MS = 8000;
  const GENERATE_MAX = 90;
  const CODEGEN_MAX = 36;

  const status = await fetchJsonWithRetry(base, "/api/deploy/status", {
    cookieHeader
  });
  if (status.status !== 200) {
    throw new Error(`deploy/status HTTP ${status.status}`);
  }
  const deploy = status.body;
  if (!deploy.ready) {
    throw new Error(`deploy/status ready=false: ${JSON.stringify(deploy)}`);
  }
  console.log("✓ /api/deploy/status ready=true mode=" + deploy.mode);

  const homeStatus = await fetchStatusWithRetry(base, "/", { cookieHeader });
  if (homeStatus !== 200) {
    throw new Error(`首页 HTTP ${homeStatus}`);
  }
  console.log("✓ 首页 HTTP 200");

  const anonCheck = (deploy.checks ?? []).find((c) => c.id === "anon_key");
  const authExpected = anonCheck?.ok === true;

  const idea = `${ideaPrefix}：做一个简单的待办清单小程序，支持添加删除任务，首版不含登录。`;
  const created = await fetchJsonWithRetry(base, "/api/projects", {
    method: "POST",
    cookieHeader,
    body: JSON.stringify({ idea })
  });

  if (authExpected && created.status === 401) {
    throw new Error("Auth 已启用但 API 返回 401 — 检查 session cookie / 测试账号");
  }
  if (created.status !== 200) {
    throw new Error(
      `创建项目失败: ${created.status} ${JSON.stringify(created.body)}`
    );
  }

  const project = created.body.project ?? {};
  const projectId = project.id;
  if (!projectId) {
    throw new Error("创建项目无 id");
  }
  console.log(`✓ 创建项目 ${projectId} (${project.title ?? "—"})`);

  const gen = await fetchJsonWithRetry(base, `/api/projects/${projectId}/generate`, {
    method: "POST",
    cookieHeader,
    body: JSON.stringify({})
  });
  if (gen.status !== 200 || !gen.body.success) {
    throw new Error(`generate 失败: ${gen.status} ${JSON.stringify(gen.body)}`);
  }
  console.log(`✓ generate 已投递 mode=${gen.body.mode ?? "?"}`);

  let completed = false;
  for (let i = 1; i <= GENERATE_MAX; i++) {
    await sleep(POLL_MS);
    const row = await fetchJsonWithRetry(base, `/api/projects/${projectId}`, {
      cookieHeader
    });
    const p = row.body.project ?? row.body;
    const st = p.status ?? "?";
    process.stdout.write(`  generate poll ${i}: ${st}\n`);
    if (st === "completed") {
      completed = true;
      break;
    }
    if (st === "failed") {
      throw new Error(`generate failed: ${JSON.stringify(row.body)}`);
    }
  }
  if (!completed) {
    throw new Error("generate 轮询超时");
  }

  const detail = await fetchJsonWithRetry(base, `/api/projects/${projectId}`, {
    cookieHeader
  });
  const proj = detail.body.project ?? detail.body;
  const reportLen = proj.final_report?.length ?? 0;
  if (reportLen < 100) {
    throw new Error(`final_report 过短: ${reportLen}`);
  }
  console.log(`✓ 方案生成 completed · report ${reportLen} chars`);

  const cg = await fetchJsonWithRetry(
    base,
    `/api/projects/${projectId}/codegen/wechat`,
    { method: "POST", cookieHeader }
  );
  if (cg.status !== 200 || !cg.body.success) {
    throw new Error(
      `codegen/wechat 失败: ${cg.status} ${JSON.stringify(cg.body)}`
    );
  }
  const runId = cg.body.runId;
  if (!runId) {
    throw new Error("无 runId");
  }
  console.log(`✓ wechat codegen 已投递 runId=${runId}`);

  for (let i = 1; i <= CODEGEN_MAX; i++) {
    await sleep(POLL_MS);
    const run = await fetchJsonWithRetry(
      base,
      `/api/projects/${projectId}/codegen/runs/${runId}`,
      { cookieHeader }
    );
    const r = run.body.run ?? {};
    const st = r.status ?? "?";
    process.stdout.write(`  codegen poll ${i}: ${st}\n`);
    if (st === "completed") {
      const previewUrl = run.body.previewUrl;
      const downloadUrl = run.body.downloadUrl;
      const buildStatus = r.metadata?.buildStatus;
      if (!downloadUrl) {
        throw new Error("completed 但无 downloadUrl");
      }
      if (!previewUrl) {
        throw new Error("completed 但无 previewUrl");
      }
      console.log(`✓ wechat codegen completed buildStatus=${buildStatus}`);
      console.log(`  download: ${downloadUrl}`);
      console.log(`  preview:  ${previewUrl}`);
      return { projectId, runId };
    }
    if (st === "failed") {
      throw new Error(`codegen failed: ${JSON.stringify(run.body)}`);
    }
  }

  throw new Error("codegen 轮询超时");
}
