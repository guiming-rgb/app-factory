#!/usr/bin/env node
/**
 * 性能回归检测 — 对比基线检测退化
 * 用法: node scripts/perf-regression.mjs [baseUrl]
 */
import { writeFileSync, readFileSync, existsSync } from "fs";
import { join } from "path";

const BASE = process.argv[2] || "http://localhost:3000";
const BASELINE_FILE = join(process.cwd(), "perf-baseline.json");

const ENDPOINTS = [
  { name: "首页", url: "/" },
  { name: "项目API", url: "/api/projects" },
  { name: "仪表盘API", url: "/api/dashboard" },
  { name: "Spec API", url: "/api/projects/nonexistent/spec", expectStatus: 400 },
];

async function measure() {
  const results = [];
  for (const ep of ENDPOINTS) {
    const times = [];
    for (let i = 0; i < 5; i++) {
      const start = performance.now();
      try {
        const res = await fetch(`${BASE}${ep.url}`, { cache: "no-store" });
        if (ep.expectStatus && res.status !== ep.expectStatus) continue;
        times.push(+(performance.now() - start).toFixed(1));
      } catch { /* skip */ }
    }
    if (times.length) {
      times.sort((a, b) => a - b);
      results.push({ name: ep.name, p50: times[Math.floor(times.length / 2)], p95: times[Math.floor(times.length * 0.95)] });
    }
  }
  return results;
}

async function main() {
  const current = await measure();
  if (!current.length) { console.log("⚠ 无法连接服务"); process.exit(1); }

  console.log("══ 当前性能 ══");
  current.forEach((r) => console.log(`  ${r.name}: p50=${r.p50}ms p95=${r.p95}ms`));

  let baseline = null;
  try { baseline = JSON.parse(readFileSync(BASELINE_FILE, "utf8")); } catch {}

  if (!baseline) {
    console.log("\n📝 无基线数据，保存当前为基线");
    writeFileSync(BASELINE_FILE, JSON.stringify(current, null, 2));
    return;
  }

  console.log("\n══ 回归检测 ══");
  const regressions = [];
  for (const cur of current) {
    const base = baseline.find((b) => b.name === cur.name);
    if (!base) continue;
    const change = +((cur.p95 - base.p95) / base.p95 * 100).toFixed(1);
    const icon = change > 20 ? "🔴" : change > 10 ? "🟡" : "🟢";
    console.log(`  ${icon} ${cur.name}: p95 ${base.p95}→${cur.p95}ms (${change > 0 ? "+" : ""}${change}%)`);
    if (change > 20) regressions.push(cur.name);
  }

  if (regressions.length) {
    console.log(`\n🔴 性能回归检测到 ${regressions.length} 个端点退化 >20%`);
    process.exit(1);
  }
  console.log("\n✅ 性能无显著退化");
}

main().catch(console.error);
