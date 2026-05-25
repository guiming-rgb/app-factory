import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";

export type WechatValidateStatus = "passed" | "failed" | "skipped";

export type WechatValidateResult = {
  status: WechatValidateStatus;
  reason?: string;
  output?: string;
};

const REQUIRED = [
  "app.json",
  "app.js",
  "app.wxss",
  "project.config.json",
  "sitemap.json",
  "pages/index/index.js",
  "pages/index/index.json",
  "pages/index/index.wxml",
  "pages/index/index.wxss",
  "pages/profile/profile.js",
  "pages/profile/profile.json",
  "pages/profile/profile.wxml",
  "pages/profile/profile.wxss",
  "utils/config.js",
  "utils/supabase.js",
  "utils/auth.js",
  "components/privacy-popup/privacy-popup.js",
  "subpkg/placeholder/index.js",
  "tool/codegen_manifest.json"
];

function isWechatBuildDisabled(): boolean {
  return process.env.CODEGEN_WECHAT_BUILD_DISABLED === "1";
}

function walkFiles(dir: string, ext: string, out: string[] = []): string[] {
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      if (name === "node_modules" || name === ".git") continue;
      walkFiles(full, ext, out);
    } else if (name.endsWith(ext)) {
      out.push(full);
    }
  }
  return out;
}

/** codegen 流水线：对生成的小程序目录做结构 + JSON/JS 门禁（无需微信开发者工具 GUI） */
export function runWechatStructureValidate(options: {
  appDir: string;
}): WechatValidateResult {
  if (isWechatBuildDisabled()) {
    return { status: "skipped", reason: "CODEGEN_WECHAT_BUILD_DISABLED=1" };
  }

  const appDir = options.appDir;
  const errors: string[] = [];

  if (!fs.existsSync(appDir)) {
    return { status: "failed", reason: "目录不存在", output: appDir };
  }

  for (const rel of REQUIRED) {
    const full = path.join(appDir, rel);
    if (!fs.existsSync(full)) {
      errors.push(`缺少文件：${rel}`);
    }
  }

  for (const jsonFile of walkFiles(appDir, ".json")) {
    try {
      JSON.parse(fs.readFileSync(jsonFile, "utf8"));
    } catch (e) {
      errors.push(
        `JSON 无效：${path.relative(appDir, jsonFile)} — ${e instanceof Error ? e.message : String(e)}`
      );
    }
  }

  for (const jsFile of walkFiles(appDir, ".js")) {
    const rel = path.relative(appDir, jsFile);
    const r = spawnSync("node", ["--check", jsFile], {
      encoding: "utf8",
      timeout: 10_000
    });
    if (r.status !== 0) {
      const msg = (r.stderr || r.stdout || "").trim().slice(0, 400);
      errors.push(`JS 语法错误：${rel}${msg ? ` — ${msg}` : ""}`);
    }
  }

  try {
    const appJsonPath = path.join(appDir, "app.json");
    if (fs.existsSync(appJsonPath)) {
      const appJson = JSON.parse(
        fs.readFileSync(appJsonPath, "utf8")
      ) as { pages?: string[]; tabBar?: { list?: { pagePath: string }[] } };
      const pages = appJson.pages ?? [];
      if (pages.length < 2) errors.push("app.json pages 少于 2");
      for (const p of pages) {
        const base = path.join(appDir, p);
        for (const ext of [".wxml", ".js", ".json"]) {
          if (!fs.existsSync(`${base}${ext}`)) {
            errors.push(`页面不完整：${p}${ext}`);
          }
        }
      }
      const tabBar = appJson.tabBar?.list ?? [];
      if (tabBar.length < 2) errors.push("tabBar 少于 2 项");
      for (const tab of tabBar) {
        if (!pages.includes(tab.pagePath)) {
          errors.push(`tabBar 指向未注册页面：${tab.pagePath}`);
        }
      }
    }
  } catch (e) {
    errors.push(`app.json 结构校验失败：${e instanceof Error ? e.message : String(e)}`);
  }

  const projPath = path.join(appDir, "project.config.json");
  if (fs.existsSync(projPath)) {
    try {
      const proj = JSON.parse(fs.readFileSync(projPath, "utf8")) as {
        compileType?: string;
      };
      if (proj.compileType !== "miniprogram") {
        errors.push("project.config.json compileType 非 miniprogram");
      }
    } catch (e) {
      errors.push(
        `project.config.json 无效：${e instanceof Error ? e.message : String(e)}`
      );
    }
  }

  if (errors.length > 0) {
    return {
      status: "failed",
      reason: "小程序结构/语法校验未通过",
      output: errors.join("\n").slice(0, 4000)
    };
  }

  return {
    status: "passed",
    output: `结构门禁通过（${REQUIRED.length} 必需文件 + JSON/JS 检查）`
  };
}

export function shouldFailCodegenOnWechatValidate(
  result: WechatValidateResult
): boolean {
  if (result.status !== "failed") return false;
  if (process.env.CODEGEN_WECHAT_BUILD_STRICT === "0") return false;
  return true;
}
