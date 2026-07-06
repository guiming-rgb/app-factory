/**
 * v2.1 Docker 沙箱：隔离 Flutter/Dart 工具链
 * npm run sandbox:flutter:docker
 * npm run sandbox:flutter:docker -- --no-build
 * npm run sandbox:flutter:docker -- --rebuild-image
 */
import {
  DEFAULT_DOCKER_OUT,
  ensureDockerImage,
  hasDocker,
  runDockerFlutterGate
} from "../lib/sandbox/flutter";
import { prepareSandboxOutput } from "../lib/flutter-codegen/generate";

async function main() {
  const noBuild = process.argv.includes("--no-build");
  const rebuildImage = process.argv.includes("--rebuild-image");

  console.log("══ v2.1 Flutter 沙箱（Docker）══\n");

  if (!hasDocker()) {
    console.error("❌ 未检测到 docker 命令，请先安装并启动 Docker Desktop");
    process.exit(1);
  }

  ensureDockerImage({ rebuild: rebuildImage });

  const { outDir, appName } = await prepareSandboxOutput({
    outDir: DEFAULT_DOCKER_OUT
  });
  console.log(`📁 ${outDir}`);

  runDockerFlutterGate({ outDir, noBuild });

  console.log(`\n✅ Docker 沙箱完成：${appName}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
