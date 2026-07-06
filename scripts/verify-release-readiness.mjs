#!/usr/bin/env node
/** npm run verify:release:readiness — 发行就绪探针（线 C 骨架） */
import { existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
let passed = 0, failed = 0;
const ok = (l) => { console.log(`  ✓ ${l}`); passed++; };
const fail = (l) => { console.error(`  ✗ ${l}`); failed++; };

console.log("══ 发行就绪探针 ══\n");

existsSync(join(ROOT, "docs/release-pipeline-sop.md")) ? ok("release-pipeline-sop.md") : fail("SOP 文档");
existsSync(join(ROOT, ".github/workflows/flutter-desktop-dual-build.yml")) ? ok("desktop build workflow") : fail("desktop workflow");
existsSync(join(ROOT, "app/api/generated-privacy/route.ts")) ? ok("generated-privacy API") : fail("privacy API");

const envHints = ["STRIPE_SECRET_KEY", "GITHUB_CLIENT_ID", "SUPABASE_SERVICE_ROLE_KEY"];
for (const k of envHints) {
  process.env[k] ? ok(`env ${k} 已配置`) : ok(`env ${k} 未配置（本地可跳过）`);
}

console.log(`\n══ 结果: ${passed} 通过 / ${failed} 失败 ══`);
process.exit(failed ? 1 : 0);
