/**
 * 静态检查：generate/codegen 路由是否接入 enforceRateLimit
 * npm run verify:v4:rate-limit
 */
import fs from "fs";
import path from "path";

const root = process.cwd();

const ROUTES = [
  "app/api/projects/[id]/generate/route.ts",
  "app/api/projects/[id]/codegen/flutter/route.ts",
  "app/api/projects/[id]/codegen/wechat/route.ts"
];

function main() {
  console.log("══ v4-6 限流守卫检查 ══\n");
  let failed = false;

  for (const rel of ROUTES) {
    const full = path.join(root, rel);
    const content = fs.readFileSync(full, "utf8");
    if (!content.includes("enforceRateLimit")) {
      console.error(`❌ ${rel} 未接入 enforceRateLimit`);
      failed = true;
    } else {
      console.log(`✓ ${rel}`);
    }
  }

  if (!fs.existsSync(path.join(root, "lib/auth/rate-limit.ts"))) {
    console.error("❌ 缺少 lib/auth/rate-limit.ts");
    failed = true;
  } else {
    console.log("✓ lib/auth/rate-limit.ts");
  }

  if (failed) {
    process.exit(1);
  }
  console.log("\n✅ 限流已接入 generate + codegen 路由");
}

main();
