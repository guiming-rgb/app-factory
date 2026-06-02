#!/usr/bin/env node
/**
 * P1-4: 代码搜索索引
 * 扫描 docs/ + lib/ 生成 search-index.json
 */
import { readdirSync, readFileSync, writeFileSync, statSync } from "fs";
import { join, relative } from "path";

const ROOT = process.cwd();
const SOURCES = ["docs", "lib", "components"];
const OUT = join(ROOT, "docs-site/public/search-index.json");

function* walk(dir) {
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = join(dir, e.name);
    if (e.isDirectory() && !e.name.startsWith(".") && e.name !== "node_modules") yield* walk(full);
    else if (e.isFile() && /\.(ts|tsx|md|mjs)$/.test(e.name)) {
      yield { path: relative(ROOT, full), content: readFileSync(full, "utf8").slice(0, 5000) };
    }
  }
}

function buildIndex() {
  const index = [];
  for (const src of SOURCES) {
    const dir = join(ROOT, src);
    if (!exists(dir)) continue;
    for (const { path: filePath, content } of walk(dir)) {
      index.push({ path: filePath, preview: content.slice(0, 200) });
    }
  }
  writeFileSync(OUT, JSON.stringify(index));
  console.log(`✅ 搜索索引: ${index.length} 个文件 → ${OUT}`);
}

function exists(p) { try { statSync(p); return true; } catch { return false; } }

buildIndex();
