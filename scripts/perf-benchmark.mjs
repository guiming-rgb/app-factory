#!/usr/bin/env node
/**
 * P0: 性能压测脚本
 * 使用 Node.js 内置 fetch 对核心 API 做基准测试
 * 用法: node scripts/perf-benchmark.mjs [baseUrl]
 */
const BASE = process.argv[2] || "http://localhost:3000";

const endpoints = [
  { name: "首页", url: "/", method: "GET" },
  { name: "项目列表", url: "/api/projects", method: "GET" },
  { name: "仪表盘 API", url: "/api/dashboard", method: "GET" },
  { name: "部署状态", url: "/api/deploy/status", method: "GET" },
  { name: "Spec 校验", url: "/api/projects/nonexistent/spec", method: "GET", expectStatus: 400 },
];

async function benchmark(endpoint, iterations = 10) {
  const times = [];
  let errors = 0;

  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    try {
      const res = await fetch(`${BASE}${endpoint.url}`, { method: endpoint.method, cache: "no-store" });
      const elapsed = +(performance.now() - start).toFixed(1);
      if (endpoint.expectStatus && res.status !== endpoint.expectStatus) {
        errors++;
        console.log(`  ⚠ ${endpoint.name}: expected ${endpoint.expectStatus}, got ${res.status} (${elapsed}ms)`);
      } else {
        times.push(elapsed);
      }
    } catch (err) {
      errors++;
      console.log(`  ❌ ${endpoint.name}: ${err.message}`);
    }
  }

  if (times.length === 0) return { name: endpoint.name, min: 0, avg: 0, max: 0, p95: 0, errors };

  times.sort((a, b) => a - b);
  const avg = +(times.reduce((s, t) => s + t, 0) / times.length).toFixed(1);
  const p95 = times[Math.floor(times.length * 0.95)] ?? times[times.length - 1];

  return {
    name: endpoint.name,
    min: times[0],
    avg,
    max: times[times.length - 1],
    p95,
    errors,
  };
}

async function main() {
  console.log(`\n══ 性能压测: ${BASE} ══\n`);

  const results = [];
  for (const ep of endpoints) {
    process.stdout.write(`${ep.name}... `);
    const r = await benchmark(ep, 20);
    results.push(r);
    console.log(`avg=${r.avg}ms p95=${r.p95}ms min=${r.min}ms err=${r.errors}`);
  }

  console.log("\n══ 汇总 ══");
  console.table(results);

  const slow = results.filter((r) => r.avg > 500 || r.p95 > 1000);
  if (slow.length > 0) {
    console.log(`\n⚠️ ${slow.length} 个端点超过性能阈值 (avg>500ms):`);
    slow.forEach((s) => console.log(`  - ${s.name}: avg=${s.avg}ms p95=${s.p95}ms`));
  } else {
    console.log("\n✅ 所有端点性能达标");
  }
}

main().catch(console.error);
