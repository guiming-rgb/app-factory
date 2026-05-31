/**
 * 绕过 git 全局 http.proxy（常见 127.0.0.1:7897 未开导致 push 失败）
 * npm run git:push
 */
import { spawnSync } from "child_process";

const r = spawnSync("git", ["push", "origin", "main"], {
  stdio: "inherit",
  env: {
    ...process.env,
    HTTP_PROXY: "",
    HTTPS_PROXY: "",
    ALL_PROXY: "",
    http_proxy: "",
    https_proxy: "",
    all_proxy: ""
  },
  // 覆盖 git 全局 proxy 配置
  encoding: "utf8"
});

// git 不读 env 清空 proxy，需显式 -c
if (r.status !== 0) {
  console.log("\n── 重试：git -c http.proxy= -c https.proxy= push ──\n");
  const r2 = spawnSync(
    "git",
    ["-c", "http.proxy=", "-c", "https.proxy=", "push", "origin", "main"],
    { stdio: "inherit", encoding: "utf8" }
  );
  process.exit(r2.status ?? 1);
}

console.log("\n✅ git push origin main 成功");
process.exit(0);
