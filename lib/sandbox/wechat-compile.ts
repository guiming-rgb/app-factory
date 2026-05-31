import fs from "fs";
import path from "path";

export type WechatCompileStatus = "passed" | "failed" | "skipped";

export type WechatCompileResult = {
  status: WechatCompileStatus;
  reason?: string;
  output?: string;
  wxmlFiles?: number;
  wxssFiles?: number;
};

import { createRequire } from "module";

const require = createRequire(import.meta.url);

type MiniprogramCompiler = {
  wxmlToJs: (rootPath: string) => string;
  wxssToJs: (rootPath: string) => string;
};

function isCompileDisabled(): boolean {
  return process.env.CODEGEN_WECHAT_COMPILE_DISABLED === "1";
}

function maxCompileAttempts(): number {
  const raw = process.env.CODEGEN_WECHAT_COMPILE_RETRIES?.trim();
  const n = raw ? Number(raw) : 2;
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.min(4, Math.floor(n));
}

function compileOnce(
  compiler: MiniprogramCompiler,
  appDir: string
): { errors: string[]; wxmlFiles: number; wxssFiles: number } {
  const wxmlFiles = countFiles(appDir, ".wxml");
  const wxssFiles = countFiles(appDir, ".wxss");
  const errors: string[] = [];

  try {
    compiler.wxmlToJs(appDir);
  } catch (err) {
    errors.push(
      `WXML 编译失败：${err instanceof Error ? err.message : String(err)}`
    );
  }

  try {
    compiler.wxssToJs(appDir);
  } catch (err) {
    errors.push(
      `WXSS 编译失败：${err instanceof Error ? err.message : String(err)}`
    );
  }

  return { errors, wxmlFiles, wxssFiles };
}

function loadCompiler(): MiniprogramCompiler | null {
  const candidates = [
    path.join(process.cwd(), "node_modules/miniprogram-compiler"),
    "miniprogram-compiler"
  ];
  for (const id of candidates) {
    try {
      return require(id) as MiniprogramCompiler;
    } catch {
      // try next
    }
  }
  return null;
}

function countFiles(dir: string, ext: string): number {
  let count = 0;
  if (!fs.existsSync(dir)) {
    return 0;
  }
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      if (name === "node_modules" || name === ".git") {
        continue;
      }
      count += countFiles(full, ext);
    } else if (name.endsWith(ext)) {
      count += 1;
    }
  }
  return count;
}

/** C3：用官方 wcc/wcsc 编译器校验 WXML/WXSS（无需微信开发者工具 GUI） */
export function runWechatCompilerValidate(options: {
  appDir: string;
}): WechatCompileResult {
  if (isCompileDisabled()) {
    return { status: "skipped", reason: "CODEGEN_WECHAT_COMPILE_DISABLED=1" };
  }

  const compiler = loadCompiler();
  if (!compiler) {
    return {
      status: "skipped",
      reason: "未安装 miniprogram-compiler（devDependency）"
    };
  }

  const appDir = options.appDir;
  if (!fs.existsSync(appDir)) {
    return { status: "failed", reason: "目录不存在", output: appDir };
  }

  const attempts = maxCompileAttempts();
  let last: ReturnType<typeof compileOnce> | null = null;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    last = compileOnce(compiler, appDir);
    if (last.errors.length === 0) {
      break;
    }
    if (attempt < attempts) {
      console.warn(
        `[wechat-compile] attempt ${attempt}/${attempts} failed, retrying…`
      );
    }
  }

  const { errors, wxmlFiles, wxssFiles } = last!;

  if (errors.length > 0) {
    return {
      status: "failed",
      reason: "小程序 WXML/WXSS 编译未通过",
      output: errors.join("\n").slice(0, 4000),
      wxmlFiles,
      wxssFiles
    };
  }

  return {
    status: "passed",
    output: `WXML/WXSS 编译通过（${wxmlFiles} wxml · ${wxssFiles} wxss）`,
    wxmlFiles,
    wxssFiles
  };
}

export function shouldFailCodegenOnWechatCompile(
  result: WechatCompileResult
): boolean {
  if (result.status !== "failed") {
    return false;
  }
  if (process.env.CODEGEN_WECHAT_COMPILE_STRICT === "0") {
    return false;
  }
  return true;
}

export function isWechatCompilerAvailable(): boolean {
  return loadCompiler() !== null && !isCompileDisabled();
}
