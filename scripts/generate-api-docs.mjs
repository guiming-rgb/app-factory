#!/usr/bin/env node
/**
 * B-1: API 文档自动生成
 * 扫描 app/api/ 目录，生成 OpenAPI/Swagger 文档
 */
import { readdirSync, readFileSync, writeFileSync, existsSync } from "fs";
import { join, relative } from "path";

const API_DIR = join(process.cwd(), "app/api");
const OUT_FILE = join(process.cwd(), "docs-site/api-reference.md");

function scanRoutes(dir, base = "") {
  const entries = readdirSync(dir, { withFileTypes: true });
  const routes = [];

  for (const entry of entries) {
    if (entry.name === "route.ts") {
      const content = readFileSync(join(dir, entry.name), "utf8");
      const methods = [];
      if (content.includes("export async function GET")) methods.push("GET");
      if (content.includes("export async function POST")) methods.push("POST");
      if (content.includes("export async function PUT")) methods.push("PUT");
      if (content.includes("export async function PATCH")) methods.push("PATCH");
      if (content.includes("export async function DELETE")) methods.push("DELETE");

      // 提取注释
      const commentMatch = content.match(/\/\*\*?\s*\n?\s*\*\s*(.+?)\s*\n/);
      const desc = commentMatch?.[1] ?? "";

      let path = "/api" + base;
      path = path.replace(/\[id\]/g, "{id}").replace(/\[runId\]/g, "{runId}").replace(/\[memoryId\]/g, "{memoryId}");

      routes.push({ path, methods, desc });
    } else if (entry.isDirectory()) {
      routes.push(...scanRoutes(join(dir, entry.name), `${base}/${entry.name}`));
    }
  }

  return routes;
}

function generateMarkdown() {
  const routes = scanRoutes(API_DIR).sort((a, b) => a.path.localeCompare(b.path));

  let md = `# API 参考文档\n\n> 自动生成于 ${new Date().toISOString()}\n\n| 方法 | 路径 | 说明 |\n|------|------|------|\n`;

  for (const r of routes) {
    md += `| ${r.methods.join(", ")} | \`${r.path}\` | ${r.desc} |\n`;
  }

  md += `\n共 ${routes.length} 个端点\n`;
  writeFileSync(OUT_FILE, md);
}

generateMarkdown();
console.log(`✅ API 文档已生成: ${OUT_FILE}`);
