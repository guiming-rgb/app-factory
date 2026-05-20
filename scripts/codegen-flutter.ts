/**
 * v2a-实现-3：Flutter Generator PoC（Spec → 目录 → ZIP，可选 dart analyze）
 *
 * npm run codegen:flutter -- --spec docs/schemas/examples/valid-minimal.json
 * npm run codegen:flutter -- --spec ... --out /tmp/kids_soccer --verify
 */
import fs from "fs/promises";
import path from "path";
import { execSync } from "child_process";

import { generateFlutterProject } from "../lib/flutter-codegen/generate";
import { zipDirectory } from "../lib/flutter-codegen/zip";
import { validateAppSpec } from "../lib/app-spec/validate";

function parseArgs(argv: string[]) {
  const out: {
    specPath?: string;
    outDir?: string;
    verify: boolean;
    zipOnly: boolean;
  } = { verify: false, zipOnly: false };

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--spec" && argv[i + 1]) {
      out.specPath = argv[++i];
    } else if (a === "--out" && argv[i + 1]) {
      out.outDir = argv[++i];
    } else if (a === "--verify") {
      out.verify = true;
    } else if (a === "--zip-only") {
      out.zipOnly = true;
    }
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const root = process.cwd();
  const specPath =
    args.specPath ??
    path.join(root, "docs/schemas/examples/valid-minimal.json");
  const raw = JSON.parse(await fs.readFile(specPath, "utf8"));
  const validation = validateAppSpec(raw);
  if (!validation.ok) {
    console.error("❌ App Spec 未通过校验");
    for (const e of validation.errors) console.error(`   ${e}`);
    process.exit(1);
  }

  console.log("══ Flutter Generator PoC ══\n");
  console.log(`Spec: ${specPath}`);
  console.log(`appName: ${validation.spec.appName}`);

  const { outputDir, appName, displayName } = await generateFlutterProject(
    validation.spec,
    { keepOutput: true }
  );

  let finalDir = outputDir;
  if (args.outDir) {
    const target = path.resolve(args.outDir);
    await fs.rm(target, { recursive: true, force: true }).catch(() => {});
    await fs.cp(outputDir, target, { recursive: true });
    finalDir = target;
    await fs.rm(path.dirname(outputDir), { recursive: true, force: true });
    console.log(`\n📁 输出目录: ${finalDir}`);
  } else {
    console.log(`\n📁 临时目录: ${finalDir}`);
  }

  const zipPath = path.join(
    args.outDir ? path.dirname(path.resolve(args.outDir)) : path.dirname(finalDir),
    `${appName}-flutter.zip`
  );
  const zipBuf = await zipDirectory(finalDir);
  await fs.writeFile(zipPath, zipBuf);
  console.log(`📦 ZIP: ${zipPath} (${zipBuf.length} bytes)`);

  if (args.verify) {
    console.log("\n📦 flutter pub get …");
    try {
      execSync("flutter pub get", { cwd: finalDir, stdio: "inherit" });
    } catch {
      console.error(
        "❌ flutter pub get 失败（请确认本机已安装 Flutter SDK 且 `flutter` 在 PATH）"
      );
      process.exit(1);
    }
    console.log("\n🔍 dart analyze …");
    try {
      execSync("dart analyze", {
        cwd: finalDir,
        stdio: "inherit"
      });
      console.log("✅ dart analyze 通过");
    } catch {
      console.error("❌ dart analyze 失败");
      process.exit(1);
    }
  }

  console.log(`\n✅ 生成完成：${displayName}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
