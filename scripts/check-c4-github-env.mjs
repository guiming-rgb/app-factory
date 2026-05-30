/**
 * C4 GitHub OAuth / PAT 环境检查（不打印密钥）
 * npm run check:c4:github
 */
import fs from "fs";
import path from "path";

const root = process.cwd();
const envPath = path.join(root, ".env.local");

function loadEnvLocal() {
  if (!fs.existsSync(envPath)) return {};
  const out = {};
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const i = trimmed.indexOf("=");
    if (i === -1) continue;
    const key = trimmed.slice(0, i).trim();
    let val = trimmed.slice(i + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

function main() {
  console.log("══ C4 GitHub 推送环境检查 ══\n");

  const env = { ...process.env, ...loadEnvLocal() };
  const appUrl = (env.NEXT_PUBLIC_APP_URL || "http://localhost:3001").replace(
    /\/$/,
    ""
  );
  const callback = `${appUrl}/api/github/oauth/callback`;

  const oauthOk =
    env.GITHUB_OAUTH_DISABLED !== "1" &&
    !!env.GITHUB_OAUTH_CLIENT_ID?.trim() &&
    !!env.GITHUB_OAUTH_CLIENT_SECRET?.trim();

  const patOk =
    !!env.GITHUB_PAT?.trim() &&
    (!!env.GITHUB_PAT_BIND_USER_ID?.trim() || !!env.V4_TEST_EMAIL?.trim());

  const dbOk = !!env.DATABASE_URL?.trim()?.startsWith("postgres");

  if (oauthOk) {
    console.log("✓ GITHUB_OAUTH_CLIENT_ID / SECRET 已配置");
  } else {
    console.log("○ OAuth 未配置（可用 PAT 模式替代）");
  }

  if (patOk) {
    console.log("✓ GITHUB_PAT 已配置（自动化 push 模式）");
  } else {
    console.log("○ GITHUB_PAT 未配置");
  }

  if (dbOk) {
    console.log("✓ DATABASE_URL 已配置");
  } else {
    console.log("✗ DATABASE_URL 未配置");
  }

  console.log(`\nOAuth 回调 URL：\n  ${callback}\n`);

  if (env.GITHUB_OAUTH_DISABLED === "1") {
    console.warn("⚠️  GITHUB_OAUTH_DISABLED=1 — OAuth 已禁用");
  }

  if (!oauthOk && !patOk) {
    console.log("维护者二选一：");
    console.log("  A) OAuth：GitHub → New OAuth App → 写入 CLIENT_ID/SECRET");
    console.log("  B) PAT：Settings → Developer settings → PAT (repo) → GITHUB_PAT");
    console.log("     然后 npm run bootstrap:github:pat");
    console.log("  共同：npm run db:apply:c4-github");
    process.exit(1);
  }

  if (!dbOk) {
    process.exit(1);
  }

  if (patOk && !oauthOk) {
    console.log("✅ C4 环境就绪（PAT 模式 · 运行 bootstrap:github:pat 绑定用户）");
  } else {
    console.log("✅ C4 环境就绪（OAuth 可启用）");
  }
}

main();
