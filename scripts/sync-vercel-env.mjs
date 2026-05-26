/**
 * 从 .env.local 同步环境变量到 Vercel Production（不打印密钥值）
 * 用法：npm run deploy:vercel:env
 * 前置：npx vercel login 或 VERCEL_TOKEN；vercel link 已关联项目
 */
import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";

const root = process.cwd();
const envFile = path.join(root, ".env.local");

const SYNC_KEYS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "OPENAI_API_KEY",
  "OPENAI_BASE_URL",
  "OPENAI_MODEL",
  "NEXT_PUBLIC_APP_URL",
  "INNGEST_EVENT_KEY",
  "INNGEST_SIGNING_KEY",
  "SUPABASE_STORAGE_BUCKET"
];

const SKIP_KEYS = new Set(["INNGEST_DEV"]);

/** 生产域名；同步时若 .env.local 为 localhost 则改用此值 */
const PRODUCTION_APP_URL =
  process.env.VERCEL_PRODUCTION_URL?.trim() ||
  "https://app-factory-five.vercel.app";

function parseEnv(content) {
  const out = {};
  for (const line of content.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq <= 0) continue;
    const key = t.slice(0, eq).trim();
    let val = t.slice(eq + 1).trim();
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
  if (!fs.existsSync(envFile)) {
    console.error("❌ 缺少 .env.local");
    process.exit(1);
  }

  const env = parseEnv(fs.readFileSync(envFile, "utf8"));
  if (env.INNGEST_DEV === "1") {
    console.warn("⚠️  .env.local 含 INNGEST_DEV=1，同步到 Vercel 前请确保生产用 Inngest Cloud 密钥");
  }

  let ok = 0;
  let skip = 0;
  for (const key of SYNC_KEYS) {
    if (SKIP_KEYS.has(key)) continue;
    let val = env[key]?.trim();
    if (!val) {
      console.log(`⏭  跳过 ${key}（.env.local 未设）`);
      skip++;
      continue;
    }
    if (
      key === "NEXT_PUBLIC_APP_URL" &&
      /localhost|127\.0\.0\.1/i.test(val)
    ) {
      console.warn(
        `⚠️  ${key} 为本地地址，同步到 Vercel 生产时改用 ${PRODUCTION_APP_URL}`
      );
      val = PRODUCTION_APP_URL;
    }
    const r = spawnSync(
      "npx",
      ["vercel", "env", "add", key, "production", "--force"],
      {
        cwd: root,
        input: val,
        encoding: "utf8",
        stdio: ["pipe", "pipe", "pipe"]
      }
    );
    if (r.status === 0) {
      console.log(`✓ ${key}`);
      ok++;
    } else {
      console.error(`✗ ${key}:`, (r.stderr || r.stdout || "").trim().slice(0, 200));
      process.exit(1);
    }
  }

  console.log(`\n✅ 已同步 ${ok} 项（跳过 ${skip}）`);
}

main();
