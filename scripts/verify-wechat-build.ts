/**
 * v2.1 / C3 小程序结构 + WXML/WXSS 真编译门禁
 * npm run verify:wechat:build [目录]
 */
import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";

import { runWechatFullBuildValidate } from "../lib/sandbox/wechat-build";

const root = process.cwd();
const argPath = process.argv[2];
const appDir = argPath
  ? path.isAbsolute(argPath)
    ? argPath
    : path.join(root, argPath)
  : path.join(root, "templates/wechat-miniprogram-minimal");

function main() {
  console.log("══ 小程序编译门禁（verify:wechat:build / C3）══\n");
  console.log(`目录: ${appDir}\n`);

  if (!fs.existsSync(appDir)) {
    console.error("❌ 目录不存在");
    process.exit(1);
  }

  const templateCheck = spawnSync(
    "node",
    [path.join(root, "scripts/verify-wechat-template.mjs"), appDir],
    { stdio: "inherit" }
  );
  if (templateCheck.status !== 0) process.exit(templateCheck.status ?? 1);

  const result = runWechatFullBuildValidate({ appDir });
  console.log(`buildStatus: ${result.status}`);
  console.log(`structureStatus: ${result.structure.status}`);
  console.log(`compileStatus: ${result.compile.status}`);
  if (result.output) console.log(result.output);

  if (result.status === "failed") {
    console.error("\n❌ verify:wechat:build 失败");
    if (result.reason) console.error(result.reason);
    process.exit(1);
  }

  console.log("\n✅ verify:wechat:build 通过（结构 + WXML/WXSS 编译）");
}

main();
