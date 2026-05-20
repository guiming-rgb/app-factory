/**
 * v2b-实现-2：微信小程序 Generator PoC（Spec → 目录 → ZIP）
 *
 * npm run codegen:wechat -- --spec docs/schemas/examples/valid-minimal.json
 * npm run codegen:wechat -- --spec ... --out /tmp/wechat-out
 */
import fs from "fs/promises";
import path from "path";

import { generateWechatProject } from "../lib/wechat-codegen/generate";
import { zipDirectory } from "../lib/flutter-codegen/zip";
import { validateAppSpec } from "../lib/app-spec/validate";

function parseArgs(argv: string[]) {
  const out: { specPath?: string; outDir?: string } = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--spec" && argv[i + 1]) out.specPath = argv[++i];
    else if (a === "--out" && argv[i + 1]) out.outDir = argv[++i];
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

  console.log("══ 微信小程序 Generator PoC ══\n");
  console.log(`Spec: ${specPath}`);
  console.log(`appName: ${validation.spec.appName}`);

  const { outputDir, appName, displayName } =
    await generateWechatProject(validation.spec);

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
    `${appName}-wechat.zip`
  );
  const zipBuf = await zipDirectory(finalDir);
  await fs.writeFile(zipPath, zipBuf);
  console.log(`📦 ZIP: ${zipPath} (${zipBuf.length} bytes)`);
  console.log(`\n✅ 生成完成：${displayName}`);
  console.log("   建议：npm run verify:wechat -- " + finalDir);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
