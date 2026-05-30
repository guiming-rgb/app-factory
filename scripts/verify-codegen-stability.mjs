/**
 * npm run verify:codegen:stability
 * 静态检查 + 可选 DB 统计（需 DATABASE_URL）
 */
import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";

const root = process.cwd();

const REQUIRED = [
  "lib/app-spec/spec-quality.ts",
  "lib/codegen/execute-harmony.ts",
  "lib/sandbox/harmony-structure.ts",
  "components/CodegenPanel.tsx",
  "app/api/projects/[id]/codegen/harmony/route.ts",
  "app/api/projects/[id]/export-harmony/route.ts"
];

function checkStatic() {
  console.log("══ Codegen 稳定专项（静态）══\n");
  for (const rel of REQUIRED) {
    if (!fs.existsSync(path.join(root, rel))) {
      console.error(`❌ 缺少 ${rel}`);
      process.exit(1);
    }
    console.log(`✓ ${rel}`);
  }

  const panel = fs.readFileSync(
    path.join(root, "components/CodegenPanel.tsx"),
    "utf8"
  );
  if (!panel.includes("specQualityScore")) {
    console.error("❌ CodegenPanel 未展示 specQualityScore");
    process.exit(1);
  }
  if (!panel.includes('"harmony"')) {
    console.error("❌ CodegenPanel 未支持 harmony");
    process.exit(1);
  }
  console.log("✓ CodegenPanel specQuality + harmony");

  const specQuality = fs.readFileSync(
    path.join(root, "lib/app-spec/spec-quality.ts"),
    "utf8"
  );
  if (!specQuality.includes("resolveCodegenScreens") && !specQuality.includes("screen.children")) {
    console.error("❌ spec-quality 缺少 screen 映射检查");
    process.exit(1);
  }
  if (!fs.existsSync(path.join(root, "lib/app-spec/resolve-codegen-screens.ts"))) {
    console.error("❌ 缺少 resolve-codegen-screens.ts");
    process.exit(1);
  }
  console.log("✓ spec-quality + resolve-codegen-screens");
}

function runStats() {
  console.log("\n══ DB 统计探针 ══\n");
  const r = spawnSync("node", ["scripts/stats-codegen-runs.mjs", "90"], {
    cwd: root,
    encoding: "utf8",
    env: process.env
  });
  if (r.status !== 0) {
    console.warn("⚠ stats 跳过（无 DATABASE_URL 或 DB 不可达）");
    if (r.stderr) console.warn(r.stderr.trim());
    return;
  }
  console.log(r.stdout.trim());
}

checkStatic();
runStats();
console.log("\n✅ verify:codegen:stability 通过");
