/**
 * 本地验收聚合（给 Agent 跑，维护者不必点网页）。
 * 用法：npm run accept
 *       npm run accept -- <projectId>
 */
import { spawnSync } from "child_process";
import fs from "fs";
import path from "path";

const projectId = process.argv[2]?.trim();
const root = process.cwd();

console.log("══ App 生产工厂 · 自动验收（accept）══\n");

const envPath = path.join(root, ".env.local");
if (!fs.existsSync(envPath)) {
  console.error("❌ 缺少 .env.local → 维护者万不得已：从 .env.local.example 复制并填密钥");
  process.exit(1);
}

const envText = fs.readFileSync(envPath, "utf8");
const required = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "OPENAI_API_KEY",
  "INNGEST_DEV",
  "NEXT_PUBLIC_APP_URL"
];
const missing = required.filter((k) => !new RegExp(`^${k}=.+`, "m").test(envText));
if (missing.length) {
  console.error("❌ .env.local 缺项：", missing.join(", "));
  console.error("   → 维护者万不得已：补全后由 Agent 重跑 npm run accept");
  process.exit(1);
}
console.log("✓ .env.local 必填项齐全（内容由 Agent 读取，勿维护者重复点 Supabase 核对）\n");

const verifyArgs = ["scripts/verify-v13.mjs"];
if (projectId) verifyArgs.push(projectId);

const verify = spawnSync(process.execPath, verifyArgs, {
  cwd: root,
  stdio: "inherit",
  env: process.env
});

if (verify.status !== 0) {
  console.log("\n── 维护者仅在以下情况介入 ──");
  console.log("1) 首次：在 .env 对应的 Supabase 项目执行 sql/migrations/*.sql");
  console.log("2) 若 Agent 未跑双进程：不必自己调试，让 Agent 执行 build + start:3001 + inngest:dev:3001 + 触发生成");
  console.log("3) 勿用手敲项目 URL / 勿在浏览器找「v1.3」字样");
  process.exit(verify.status ?? 1);
}

console.log("\n✅ accept 通过（终端验收完成，维护者无需再点详情页）。");
process.exit(0);
