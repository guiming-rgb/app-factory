/**
 * 静态检查：/api/projects/[id]/* 路由是否接入 owner 校验
 * npm run verify:v4:owner-api
 */
import fs from "fs";
import path from "path";

const root = process.cwd();
const projectsApiDir = path.join(root, "app/api/projects");

function collectRouteFiles(dir) {
  /** @type {string[]} */
  const files = [];
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectRouteFiles(full));
    } else if (entry.name === "route.ts" && full.includes(`${path.sep}[id]${path.sep}`)) {
      files.push(full);
    }
  }
  return files;
}

function main() {
  const guards = ["guardProjectAccess", "fetchProjectWithAccess"];
  const files = collectRouteFiles(projectsApiDir);
  const missing = [];

  for (const file of files) {
    const rel = path.relative(root, file);
    const content = fs.readFileSync(file, "utf8");
    if (!guards.some((g) => content.includes(g))) {
      missing.push(rel);
    }
  }

  console.log(`══ v4-3 API owner 守卫检查 ══\n共 ${files.length} 个 [id] 路由\n`);

  if (missing.length) {
    console.error("❌ 以下路由未接入 owner 校验：");
    for (const f of missing) console.error(`  - ${f}`);
    process.exit(1);
  }

  for (const f of files.sort()) {
    console.log(`✓ ${path.relative(root, f)}`);
  }
  console.log("\n✅ 全部 [id] 路由已接入 guardProjectAccess / fetchProjectWithAccess");
}

main();
