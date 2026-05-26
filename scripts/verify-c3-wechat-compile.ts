/**
 * C3 小程序真编译验收
 * npm run verify:c3:wechat-compile
 */
import fs from "fs";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";

import { runWechatCompilerValidate } from "../lib/sandbox/wechat-compile";
import { runWechatFullBuildValidate } from "../lib/sandbox/wechat-build";
import { generateWechatProject } from "../lib/wechat-codegen/generate";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

function checkStatic() {
  console.log("══ C3 小程序真编译（静态）══\n");

  const required = [
    "lib/sandbox/wechat-compile.ts",
    "lib/sandbox/wechat-build.ts",
    "lib/codegen/execute-wechat.ts",
    "scripts/verify-wechat-build.ts"
  ];

  for (const rel of required) {
    if (!fs.existsSync(path.join(root, rel))) {
      console.error(`❌ 缺少 ${rel}`);
      process.exit(1);
    }
    console.log(`✓ ${rel}`);
  }

  const execute = fs.readFileSync(
    path.join(root, "lib/codegen/execute-wechat.ts"),
    "utf8"
  );
  for (const token of ["runWechatFullBuildValidate", "compileStatus"]) {
    if (!execute.includes(token)) {
      console.error(`❌ execute-wechat 缺少 ${token}`);
      process.exit(1);
    }
    console.log(`✓ execute-wechat 含 ${token}`);
  }

  const pkg = JSON.parse(
    fs.readFileSync(path.join(root, "package.json"), "utf8")
  ) as { devDependencies?: Record<string, string> };
  if (!pkg.devDependencies?.["miniprogram-compiler"]) {
    console.error("❌ package.json 缺少 devDependency miniprogram-compiler");
    process.exit(1);
  }
  console.log("✓ devDependency miniprogram-compiler");

  console.log("\n✅ C3 静态接线通过");
}

async function checkTemplateCompile() {
  console.log("\n══ C3 模板编译探针 ══\n");
  const appDir = path.join(root, "templates/wechat-miniprogram-minimal");
  const result = runWechatFullBuildValidate({ appDir });
  console.log(`structure: ${result.structure.status}`);
  console.log(`compile: ${result.compile.status}`);
  if (result.status !== "passed") {
    console.error("❌ 模板编译失败");
    if (result.output) console.error(result.output);
    process.exit(1);
  }
  console.log("✓ 最小模板通过结构 + WXML/WXSS 编译");
}

async function checkCodegenOutputCompile() {
  console.log("\n══ C3 codegen 产物编译探针 ══\n");

  const specPath = path.join(
    root,
    "docs/schemas/examples/valid-minimal.json"
  );
  const spec = JSON.parse(fs.readFileSync(specPath, "utf8"));
  const { outputDir } = await generateWechatProject(spec);
  try {
    const result = runWechatFullBuildValidate({ appDir: outputDir });
    console.log(`structure: ${result.structure.status}`);
    console.log(`compile: ${result.compile.status}`);
    if (result.status !== "passed") {
      console.error("❌ codegen 产物编译失败");
      if (result.output) console.error(result.output);
      process.exit(1);
    }
    console.log("✓ valid-minimal Spec 生成的小程序通过编译门禁");
  } finally {
    await fs.promises.rm(path.dirname(outputDir), {
      recursive: true,
      force: true
    });
  }
}

function checkNegativeCompile() {
  console.log("\n══ C3 负例探针（坏 WXML 应失败）══\n");

  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "wechat-c3-bad-"));
  const appDir = path.join(tmpRoot, "bad-mini");
  fs.mkdirSync(path.join(appDir, "pages/bad"), { recursive: true });
  fs.writeFileSync(
    path.join(appDir, "pages/bad/index.wxml"),
    "<view><text>{{broken</text></view>\n",
    "utf8"
  );

  try {
    const result = runWechatCompilerValidate({ appDir });
    if (result.status !== "failed") {
      console.error("❌ 坏 WXML 应导致 compile failed");
      process.exit(1);
    }
    console.log("✓ 坏 WXML 被 wcc 编译器拒绝");
  } finally {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
}

function main() {
  checkStatic();
  checkTemplateCompile();
  void checkCodegenOutputCompile()
    .then(() => {
      checkNegativeCompile();
      console.log("\n✅ verify:c3:wechat-compile 全部通过");
    })
    .catch((e) => {
      console.error("❌", e instanceof Error ? e.message : e);
      process.exit(1);
    });
}

main();
