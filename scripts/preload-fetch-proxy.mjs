/**
 * 在探针主脚本之前执行（package.json 使用 node --import）
 * 让 Node fetch 走 http_proxy / V3_HTTP_PROXY（本机常见 127.0.0.1:7897）
 */
import fs from "fs";
import path from "path";

function loadV3HttpProxyFromEnvLocal() {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const i = trimmed.indexOf("=");
    if (i === -1) continue;
    const key = trimmed.slice(0, i).trim();
    if (key !== "V3_HTTP_PROXY") continue;
    let val = trimmed.slice(i + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!process.env.V3_HTTP_PROXY) process.env.V3_HTTP_PROXY = val;
    break;
  }
}

loadV3HttpProxyFromEnvLocal();

const proxy =
  process.env.V3_HTTP_PROXY?.trim() ||
  process.env.HTTPS_PROXY?.trim() ||
  process.env.https_proxy?.trim() ||
  process.env.HTTP_PROXY?.trim() ||
  process.env.http_proxy?.trim() ||
  process.env.ALL_PROXY?.trim() ||
  process.env.all_proxy?.trim() ||
  "";

if (proxy) {
  if (!process.env.HTTP_PROXY) process.env.HTTP_PROXY = proxy;
  if (!process.env.HTTPS_PROXY) process.env.HTTPS_PROXY = proxy;
  process.env._V3_PROBE_PROXY = proxy;
}
// NODE_USE_ENV_PROXY 须在 npm script / 终端启动 node 前设置（见 package.json）
