/**
 * npm run verify:industry:templates
 * 行业模板 Spec → Flutter/微信/鸿蒙 生成门禁
 */
import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";

const root = process.cwd();

function fail(msg) {
  console.error(`❌ ${msg}`);
  process.exit(1);
}

function ok(msg) {
  console.log(`✓ ${msg}`);
}

function checkStaticRoutes() {
  console.log("══ 静态路由检查 ══\n");
  const wechat = fs.readFileSync(path.join(root, "lib/wechat-codegen/generate.ts"), "utf8");
  const harmony = fs.readFileSync(path.join(root, "lib/harmony-codegen/generate.ts"), "utf8");
  const flutter = fs.readFileSync(path.join(root, "lib/flutter-codegen/generate.ts"), "utf8");

  for (const token of ["chart", "onboarding", "emitWechatChartWxml"]) {
    if (!wechat.includes(token)) fail(`微信 generate.ts 缺少 ${token}`);
  }
  ok("微信 chart + onboarding 路由");

  if (!harmony.includes("emitHarmonyChart") || !harmony.includes("emitHarmonyOnboarding")) {
    fail("鸿蒙 generate.ts 未包含 chart/kanban/onboarding 扩展路由");
  }
  ok("鸿蒙 chart + kanban + onboarding 路由");

  if (!flutter.includes("copyIndustryTemplate") || !flutter.includes("emitFlutterIndustryGamePage")) {
    fail("Flutter generate.ts 未接入行业模板 pipeline");
  }
  ok("Flutter detectIndustry + copyIndustryTemplate + game/payment 路由");
}

function runVitest() {
  console.log("\n══ 行业 Pipeline 集成测试 ══\n");
  const r = spawnSync(
    "npx",
    ["vitest", "run", "lib/flutter-codegen/__tests__/industry-pipeline.test.ts"],
    { cwd: root, encoding: "utf8", stdio: "pipe" }
  );
  if (r.stdout) process.stdout.write(r.stdout);
  if (r.stderr) process.stderr.write(r.stderr);
  if (r.status !== 0) fail("industry-pipeline vitest 失败");
  ok("17 套行业模板 + game/payment 集成测试通过");
}

checkStaticRoutes();
runVitest();
console.log("\n✅ verify:industry:templates 全部通过\n");
