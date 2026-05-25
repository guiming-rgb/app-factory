/**
 * 静态检查：Inngest 事件是否携带 userId 并在函数入口校验 owner
 * npm run verify:v4:inngest-auth
 */
import fs from "fs";
import path from "path";

const root = process.cwd();

const CHECKS = [
  {
    file: "lib/inngest/functions.ts",
    mustInclude: ["assertInngestProjectOwner", "event.data.userId"]
  },
  {
    file: "lib/inngest/codegen-functions.ts",
    mustInclude: ["assertInngestProjectOwner", "event.data.userId"]
  },
  {
    file: "app/api/projects/[id]/generate/route.ts",
    mustInclude: ["inngestUserIdFromSession"]
  },
  {
    file: "lib/codegen/enqueue.ts",
    mustInclude: ["inngestUserIdFromSession", "userId"]
  },
  {
    file: "lib/auth/inngest-project-auth.ts",
    mustInclude: ["NonRetriableError", "owner_id"]
  }
];

function main() {
  console.log("══ v4-5 Inngest userId 检查 ══\n");
  let failed = false;

  for (const { file, mustInclude } of CHECKS) {
    const full = path.join(root, file);
    if (!fs.existsSync(full)) {
      console.error(`❌ 缺少文件: ${file}`);
      failed = true;
      continue;
    }
    const content = fs.readFileSync(full, "utf8");
    const missing = mustInclude.filter((s) => !content.includes(s));
    if (missing.length) {
      console.error(`❌ ${file} 缺少: ${missing.join(", ")}`);
      failed = true;
    } else {
      console.log(`✓ ${file}`);
    }
  }

  if (failed) {
    process.exit(1);
  }
  console.log("\n✅ Inngest userId 守卫已接入");
  console.log("   运行时验收：Auth 启用下伪造 userId 的事件应 NonRetriableError 且不写库");
}

main();
