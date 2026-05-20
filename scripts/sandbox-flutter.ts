/**
 * v2.1 PoC：本机 Flutter 沙箱（Spec → 生成 → analyze → 可选 build）
 */
import {
  DEFAULT_HOST_OUT,
  hasFlutter,
  prepareSandboxOutput,
  runFlutterApkDebugBuild,
  runFlutterPubGetAndAnalyze
} from "../lib/sandbox/flutter";

async function main() {
  const noBuild = process.argv.includes("--no-build");
  console.log("══ v2.1 Flutter 沙箱（本机）══\n");

  const { outDir, appName } = await prepareSandboxOutput({ outDir: DEFAULT_HOST_OUT });
  console.log(`📁 ${outDir}`);

  runFlutterPubGetAndAnalyze(outDir);

  if (!noBuild && hasFlutter()) {
    try {
      runFlutterApkDebugBuild(outDir);
    } catch {
      console.warn("⚠️ flutter build 未通过或超时");
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
