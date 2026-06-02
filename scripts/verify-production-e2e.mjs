#!/usr/bin/env node
/**
 * P0: 生产环境端到端验证
 * 用法: node scripts/verify-production-e2e.mjs [baseUrl]
 * 验证: 首页 → API → Spec → Codegen → 健康检查
 */
const BASE = process.argv[2] || "http://localhost:3000";

const CHECKS = [
  { name: "首页 HTML", path: "/", check: (r) => r.status === 200 },
  { name: "项目列表 API", path: "/api/projects", check: (r) => r.status === 200 },
  { name: "仪表盘 API", path: "/api/dashboard", check: (r) => r.status === 200 },
  { name: "部署状态 API", path: "/api/deploy/status", check: (r) => r.status === 200 },
  { name: "Spec API (无项目)", path: "/api/projects/nonexistent/spec", check: (r) => r.status >= 400 },
  { name: "Skills API", path: "/api/skills", check: (r) => [200, 401].includes(r.status) },
];

async function verify() {
  console.log(`\n══ 端到端生产验证: ${BASE} ══\n`);
  let passed = 0, failed = 0;

  for (const c of CHECKS) {
    try {
      const res = await fetch(`${BASE}${c.path}`, { cache: "no-store" });
      const ok = c.check(res);
      console.log(ok ? `✅ ${c.name}` : `❌ ${c.name} — status=${res.status}`);
      ok ? passed++ : failed++;
    } catch (e) {
      console.log(`❌ ${c.name} — ${e.message}`);
      failed++;
    }
  }

  // Flutter codegen smoke test
  try {
    const specRes = await fetch(`${BASE}/api/projects/nonexistent/codegen/flutter`, { method: "POST", cache: "no-store" });
    console.log(specRes.status >= 400 ? `✅ Codegen API (拒绝无效项目)` : `⚠ Codegen API — unexpected status ${specRes.status}`);
    specRes.status >= 400 ? passed++ : failed++;
  } catch (e) {
    console.log(`❌ Codegen API — ${e.message}`);
    failed++;
  }

  console.log(`\n══ 结果: ${passed}/${passed + failed} 通过 ══\n`);
  process.exit(failed > 0 ? 1 : 0);
}

verify();
