/**
 * v2.1 PoC：Flutter 沙箱门禁（Spec → 生成 → analyze → 可选 build）
 * npm run sandbox:flutter
 * npm run sandbox:flutter -- --no-build
 */
import { execSync } from "child_process";
import fs from "fs/promises";
import path from "path";

import { generateFlutterProject } from "../lib/flutter-codegen/generate";
import { validateAppSpec } from "../lib/app-spec/validate";

function hasFlutter(): boolean {
  try {
    execSync("flutter --version", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const noBuild = process.argv.includes("--no-build");
  const root = process.cwd();
  const specPath = path.join(
    root,
    "docs/schemas/examples/valid-minimal.json"
  );
  const outDir = "/tmp/app-factory-sandbox-flutter";
  const spec = JSON.parse(await fs.readFile(specPath, "utf8"));
  const validation = validateAppSpec(spec);
  if (!validation.ok) {
    console.error("❌ Spec 无效");
    process.exit(1);
  }

  console.log("══ v2.1 Flutter 沙箱 PoC ══\n");

  await fs.rm(outDir, { recursive: true, force: true }).catch(() => {});
  const { outputDir, appName } = await generateFlutterProject(validation.spec);
  await fs.cp(outputDir, outDir, { recursive: true });
  await fs.rm(path.dirname(outputDir), { recursive: true, force: true });
  console.log(`📁 ${outDir}`);

  console.log("\n📦 flutter pub get …");
  execSync("flutter pub get", { cwd: outDir, stdio: "inherit" });

  console.log("\n🔍 dart analyze …");
  execSync("dart analyze", { cwd: outDir, stdio: "inherit" });
  console.log("✅ dart analyze 通过");

  if (!noBuild && hasFlutter()) {
    console.log("\n🏗 flutter build apk --debug（PoC，可能较久）…");
    try {
      execSync("flutter build apk --debug", {
        cwd: outDir,
        stdio: "inherit",
        timeout: 300_000
      });
      console.log("✅ flutter build apk 通过");
    } catch {
      console.warn("⚠️ flutter build 未通过或超时（analyze 已过仍算 PoC 部分通过）");
      process.exit(1);
    }
  } else if (!noBuild) {
    console.log("\n⏭ 跳过 flutter build（未检测到 flutter 命令）");
  }

  console.log(`\n✅ 沙箱完成：${appName}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
