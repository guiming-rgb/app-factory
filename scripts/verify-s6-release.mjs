/**
 * S6 发版前全链路验收
 * npm run verify:s6:release
 *
 * 1. build（静态编译）
 * 2. verify:v4:batch:local（静态 + 本地库检查）
 * 3. verify:v4:production（生产 Auth 探针，网络失败 WARN）
 * 4. verify:v3:production（生产全链路；网络失败则 fallback verify:s6:local-full）
 */
import { spawnSync } from "child_process";

function run(script, { allowFail = false } = {}) {
  const r = spawnSync("npm", ["run", script], {
    stdio: "inherit",
    encoding: "utf8"
  });
  const code = r.status ?? 1;
  if (code !== 0 && !allowFail) {
    process.exit(code);
  }
  return code;
}

console.log("══ S6 发版前全链路验收 ══\n");

console.log("── 1/4 build ──\n");
if (run("build") !== 0) {
  process.exit(1);
}

console.log("\n── 2/4 verify:v4:batch:local ──\n");
if (run("verify:v4:batch:local") !== 0) {
  process.exit(1);
}

console.log("\n── 3/4 verify:v4:production ──\n");
const prodSmoke = run("verify:v4:production", { allowFail: true });
if (prodSmoke !== 0) {
  console.warn("\n⚠️  生产 Auth 探针未通过或网络跳过 — 继续尝试全链路\n");
}

console.log("\n── 4/4 verify:v3:production（生产全链路）──\n");
const prodFull = spawnSync("npm", ["run", "verify:v3:production"], {
  stdio: "inherit",
  encoding: "utf8"
});
const prodFullCode = prodFull.status ?? 1;

if (prodFullCode === 0) {
  console.log("\n✅ verify:s6:release 通过（生产全链路）");
  process.exit(0);
}

if (prodFullCode === 2) {
  console.log("\n── 4b fallback verify:s6:local-full ──\n");
  const localCode = run("verify:s6:local-full", { allowFail: true });
  if (localCode === 0) {
    console.log("\n✅ verify:s6:release 通过（本地全链路 fallback）");
    console.log("   提示：生产 URL 从本机不可达；发版前请在浏览器或 CI 再跑 verify:v3:production");
    process.exit(0);
  }
  console.error("\n❌ 生产 unreachable 且本地全链路失败");
  process.exit(1);
}

console.error("\n❌ verify:s6:release 失败（生产全链路报错，非纯网络）");
process.exit(prodFullCode);
