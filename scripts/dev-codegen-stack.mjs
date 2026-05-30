/**
 * 本地 codegen 双进程一键启动（Next + Inngest Dev，同端口）
 * npm run dev:codegen:3001
 *
 * 前置：npm run build
 * 若 8288 已被旧 Inngest 占用，请先关掉旧终端 B。
 */
import { spawn } from "child_process";
import fs from "fs";
import net from "net";
import path from "path";

const PORT = Number(process.env.CODEGEN_DEV_PORT ?? 3001);
const ROOT = process.cwd();
const NEXT_URL = `http://127.0.0.1:${PORT}`;
const INNGEST_URL = `${NEXT_URL}/api/inngest`;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function portTaken(port) {
  return new Promise((resolve) => {
    const srv = net.createServer();
    srv.once("error", () => resolve(true));
    srv.once("listening", () => {
      srv.close(() => resolve(false));
    });
    srv.listen(port, "127.0.0.1");
  });
}

async function waitHttp(url, label, attempts = 90) {
  for (let i = 1; i <= attempts; i++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
      if (res.ok || res.status === 401 || res.status === 405) {
        console.log(`✓ ${label} (${url})`);
        return;
      }
    } catch {
      /* retry */
    }
    await sleep(1000);
  }
  throw new Error(`${label} 启动超时：${url}`);
}

function spawnLogged(name, cmd, args) {
  const child = spawn(cmd, args, {
    cwd: ROOT,
    stdio: "inherit",
    env: {
      ...process.env,
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL ?? NEXT_URL
    }
  });
  child.on("exit", (code, signal) => {
    console.error(`\n[${name}] 退出 code=${code} signal=${signal ?? ""}`);
    process.exit(code ?? 1);
  });
  return child;
}

async function main() {
  if (!fs.existsSync(path.join(ROOT, ".next"))) {
    console.error("❌ 请先 npm run build");
    process.exit(1);
  }

  if (await portTaken(PORT)) {
    console.error(`❌ 端口 ${PORT} 已被占用 — 请关闭旧 Next 或设置 CODEGEN_DEV_PORT=3003`);
    process.exit(1);
  }

  console.log("══ dev:codegen 双进程 ══\n");
  console.log(`Next:    ${NEXT_URL}`);
  console.log(`Inngest: ${INNGEST_URL}`);
  console.log(`UI:      http://127.0.0.1:8288`);
  console.log("若 8288 已有旧 Inngest，请先关闭，避免事件被错误 App 消费。\n");

  spawnLogged("next", "npm", ["run", "start", "--", "-p", String(PORT)]);
  await sleep(2000);
  spawnLogged("inngest", "npx", ["inngest-cli", "dev", "-u", INNGEST_URL]);

  await waitHttp(NEXT_URL, "Next");
  await waitHttp("http://127.0.0.1:8288/", "Inngest Dev UI");

  console.log("\n✅ 双进程就绪 — Ctrl+C 结束\n");
  await new Promise(() => {});
}

main().catch((e) => {
  console.error("❌", e instanceof Error ? e.message : e);
  process.exit(1);
});
