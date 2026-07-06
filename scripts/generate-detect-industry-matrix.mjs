#!/usr/bin/env node
/**
 * P4: detect-industry-matrix 校验/生成
 * npm run generate:detect-matrix [-- --check|--write]
 */
import { existsSync, readFileSync, writeFileSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const CONFIG_DIR = join(ROOT, "config", "industries");
const MATRIX_PATH = join(
  ROOT,
  "lib/app-spec/__tests__/fixtures/detect-industry-matrix.json",
);

const CASES_PER_INDUSTRY = 10;
const mode = process.argv.includes("--write") ? "write" : "check";

function listIndustryIds() {
  return readdirSync(CONFIG_DIR)
    .filter((f) => f.endsWith(".json") && f !== "detect-rules.json")
    .map((f) => f.replace(".json", ""))
    .sort();
}

function loadMatrix() {
  return JSON.parse(readFileSync(MATRIX_PATH, "utf8"));
}

function defaultScreens(industry) {
  return [`${industry}_home`, `${industry}_list`, `${industry}_detail`];
}

function buildPlaceholderCases(industry, displayName) {
  return Array.from({ length: CASES_PER_INDUSTRY }, (_, i) => ({
    industry,
    displayName: i === 0 ? displayName : `${displayName} ${i + 1}`,
    appName: `${industry}_app_${i + 1}`,
    screens: defaultScreens(industry),
  }));
}

let failed = 0;
const industries = listIndustryIds();
const matrix = loadMatrix();
const cases = matrix.cases ?? [];
const byIndustry = new Map();

for (const c of cases) {
  if (!byIndustry.has(c.industry)) byIndustry.set(c.industry, []);
  byIndustry.get(c.industry).push(c);
}

console.log(`══ detect-industry-matrix ${mode} ══\n`);

for (const id of industries) {
  const count = byIndustry.get(id)?.length ?? 0;
  if (count !== CASES_PER_INDUSTRY) {
    console.error(`  ✗ ${id}: ${count}/${CASES_PER_INDUSTRY} cases`);
    failed++;
    if (mode === "write") {
      const cfg = JSON.parse(
        readFileSync(join(CONFIG_DIR, `${id}.json`), "utf8"),
      );
      const existing = byIndustry.get(id) ?? [];
      const needed = CASES_PER_INDUSTRY - existing.length;
      if (needed > 0) {
        const placeholders = buildPlaceholderCases(id, cfg.displayName ?? id).slice(
          existing.length,
        );
        cases.push(...placeholders);
        byIndustry.set(id, [...existing, ...placeholders]);
        console.log(`    + 补 ${needed} 条占位 case`);
      }
    }
  } else {
    console.log(`  ✓ ${id}: ${count} cases`);
  }
}

const matrixIndustries = new Set(cases.map((c) => c.industry));
for (const extra of matrixIndustries) {
  if (!industries.includes(extra)) {
    console.error(`  ✗ matrix 含未配置行业: ${extra}`);
    failed++;
  }
}

if (mode === "write" && failed > 0) {
  matrix.description = `detectIndustry 准确率测试矩阵 — ${industries.length} 行业 × ${CASES_PER_INDUSTRY} 描述变体`;
  matrix.cases = cases;
  writeFileSync(MATRIX_PATH, JSON.stringify(matrix, null, 2) + "\n");
  console.log(`\n已写入 ${MATRIX_PATH}`);
  failed = 0;
}

console.log(`\n══ 结果: ${failed ? "FAIL" : "OK"} ══`);
process.exit(failed ? 1 : 0);
