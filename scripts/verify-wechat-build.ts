/**
 * v2.1 小程序结构/语法门禁
 * npm run verify:wechat:build [目录]
 */
import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";

import { runWechatStructureValidate } from "../lib/sandbox/wechat-validate";

const root = process.cwd();
const argPath = process.argv[2];
const appDir = argPath
  ? path.isAbsolute(argPath)
    ? argPath
    : path.join(root, argPath)
  : path.join(root, "templates/wechat-miniprogram-minimal");

function main() {
  console.log("══ 小程序结构门禁（verify:wechat:build）══\n");
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

  const result = runWechatStructureValidate({ appDir });
  console.log(`buildStatus: ${result.status}`);
  if (result.output) console.log(result.output);

  if (result.status === "failed") {
    console.error("\n❌ verify:wechat:build 失败");
    if (result.reason) console.error(result.reason);
    if (result.output) console.error(result.output);
    process.exit(1);
  }

  console.log("\n✅ verify:wechat:build 通过");
}

main();
