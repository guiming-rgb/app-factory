/**
 * 将 GITHUB_PAT 写入 user_github_connections（E2E 自动化 push，无需浏览器 OAuth）
 *
 * 用法（.env.local）：
 *   GITHUB_PAT=ghp_...
 *
 * npm run bootstrap:github:pat
 */
import fs from "fs";
import path from "path";

import pg from "pg";

const root = process.cwd();

function loadEnvLocal() {
  const envPath = path.join(root, ".env.local");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i <= 0) continue;
    const k = t.slice(0, i).trim();
    const v = t.slice(i + 1).trim();
    if (!process.env[k]) process.env[k] = v;
  }
}

function assertRealPat(pat) {
  if (/你的token|your.?token|xxx/i.test(pat) || pat.length < 20) {
    throw new Error(
      "GITHUB_PAT 仍是占位符或太短 — 请从 GitHub Settings → Tokens 复制真实 ghp_… 串"
    );
  }
  if (/\s/.test(pat)) {
    throw new Error("GITHUB_PAT 含空格或换行 — 请只保留 ghp_ 开头的一整串，不要加引号");
  }
  if (!pat.startsWith("ghp_") && !pat.startsWith("github_pat_")) {
    throw new Error(
      "GITHUB_PAT 格式不对 — Classic 应以 ghp_ 开头，Fine-grained 以 github_pat_ 开头"
    );
  }
}

async function fetchGitHubLogin(pat) {
  const res = await fetch("https://api.github.com/user", {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${pat}`,
      "X-GitHub-Api-Version": "2022-11-28"
    }
  });
  const data = await res.json();
  if (!res.ok || !data.id || !data.login) {
    const msg = data.message || "GitHub PAT 无效";
    if (msg === "Bad credentials") {
      throw new Error(
        "Bad credentials — PAT 无效。常见原因：① token 复制不完整/多了空格 ② 已过期或被 Revoke ③ 未勾选 repo 权限 ④ 把 OAuth Secret 当成了 PAT。请重新生成 Classic token：https://github.com/settings/tokens"
      );
    }
    throw new Error(msg);
  }
  return { id: data.id, login: data.login };
}

async function resolveE2eUserId(client) {
  const bind = process.env.GITHUB_PAT_BIND_USER_ID?.trim();
  if (bind) return bind;

  const email = process.env.V4_TEST_EMAIL?.trim();
  if (!email) {
    throw new Error("缺少 GITHUB_PAT_BIND_USER_ID 或 V4_TEST_EMAIL");
  }

  const { rows } = await client.query(
    `select id from auth.users where email = $1 limit 1`,
    [email]
  );
  if (!rows[0]?.id) {
    throw new Error(`未找到 E2E 用户 ${email}`);
  }
  return String(rows[0].id);
}

async function main() {
  loadEnvLocal();

  const pat = process.env.GITHUB_PAT?.trim();
  if (!pat) {
    console.error("❌ 缺少 GITHUB_PAT");
    process.exit(1);
  }
  assertRealPat(pat);

  const dbUrl = process.env.DATABASE_URL?.trim();
  if (!dbUrl) {
    console.error("❌ 缺少 DATABASE_URL");
    process.exit(1);
  }

  console.log("══ bootstrap GitHub PAT 连接 ══\n");

  const profile = await fetchGitHubLogin(pat);
  console.log(`✓ PAT 有效 · @${profile.login}`);

  const client = new pg.Client({ connectionString: dbUrl });
  await client.connect();

  try {
    const userId = await resolveE2eUserId(client);
    console.log(`✓ 绑定用户 ${userId}`);

    await client.query(
      `insert into public.user_github_connections
        (user_id, github_user_id, github_login, access_token, scope, token_type, connected_at, updated_at)
       values ($1, $2, $3, $4, 'repo', 'bearer', now(), now())
       on conflict (user_id) do update set
         github_user_id = excluded.github_user_id,
         github_login = excluded.github_login,
         access_token = excluded.access_token,
         scope = excluded.scope,
         updated_at = now()`,
      [userId, profile.id, profile.login, pat]
    );

    console.log("\n✅ user_github_connections 已写入");
    console.log("   建议在 .env.local 补充（供 push-token 回退）：");
    console.log(`   GITHUB_PAT_BIND_USER_ID=${userId}`);
    console.log(`   GITHUB_PAT_LOGIN=${profile.login}`);
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error("❌", e instanceof Error ? e.message : e);
  process.exit(1);
});
