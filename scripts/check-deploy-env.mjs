/**
 * 部署前环境变量自检（不读 .env.local，仅检查当前 shell / CI 注入）
 * npm run check:deploy
 */
const REQUIRED = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "OPENAI_API_KEY",
  "NEXT_PUBLIC_APP_URL"
];

const PRODUCTION_INNGEST = ["INNGEST_EVENT_KEY", "INNGEST_SIGNING_KEY"];

function main() {
  const missing = REQUIRED.filter((k) => !process.env[k]?.trim());
  if (missing.length) {
    console.error("❌ 缺少必填环境变量：", missing.join(", "));
    console.error("   本地请配置 .env.local；Vercel 请在 Project Settings → Environment Variables 填写。");
    process.exit(1);
  }

  const isDev = process.env.INNGEST_DEV === "1";
  if (!isDev) {
    const missingInngest = PRODUCTION_INNGEST.filter(
      (k) => !process.env[k]?.trim()
    );
    if (missingInngest.length) {
      console.error(
        "❌ 生产模式（未设 INNGEST_DEV=1）缺少 Inngest Cloud 密钥：",
        missingInngest.join(", ")
      );
      process.exit(1);
    }
  } else {
    console.log("ℹ️  INNGEST_DEV=1：跳过 INNGEST_EVENT_KEY / SIGNING_KEY 检查");
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL.trim();
  if (!/^https?:\/\//i.test(url)) {
    console.error("❌ NEXT_PUBLIC_SUPABASE_URL 必须是 https:// 开头的完整 URL");
    process.exit(1);
  }

  console.log("✅ 部署环境变量检查通过");
  console.log(`   Supabase: ${url.replace(/^https?:\/\//, "").split("/")[0]}`);
  console.log(`   App URL: ${process.env.NEXT_PUBLIC_APP_URL.trim()}`);
}

main();
