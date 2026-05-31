import fs from "fs";
import path from "path";

/**
 * 读取 .env.local（不覆盖已有 process.env）
 */
export function loadEnvLocal(cwd = process.cwd()) {
  const envPath = path.join(cwd, ".env.local");
  if (!fs.existsSync(envPath)) return {};
  const out = {};
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i <= 0) continue;
    const key = t.slice(0, i).trim();
    let val = t.slice(i + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

/** 合并 .env.local 到 process.env（仅补缺） */
export function applyEnvLocal(cwd = process.cwd()) {
  const local = loadEnvLocal(cwd);
  for (const [k, v] of Object.entries(local)) {
    if (process.env[k] == null || process.env[k] === "") {
      process.env[k] = v;
    }
  }
  return local;
}
