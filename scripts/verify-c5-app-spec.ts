/**
 * C5 App Spec 阶段 C 验收
 * npm run verify:c5:app-spec
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import { buildMinimalSpecFromProject } from "../lib/app-spec/from-project";
import { mergeSpecWithMinimal } from "../lib/app-spec/merge-spec";
import { resolveBackendTarget } from "../lib/app-spec/backend-target";
import { normalizeWechatMiniProgramTarget } from "../lib/app-spec/normalize-wechat-target";
import { resolveWechatTabIds } from "../lib/app-spec/resolve-tabs";
import { validateAppSpec } from "../lib/app-spec/validate";
import { generateWechatProject } from "../lib/wechat-codegen/generate";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

function checkStatic() {
  console.log("══ C5 App Spec 阶段 C（静态）══\n");

  const required = [
    "lib/app-spec/backend-target.ts",
    "lib/app-spec/normalize-wechat-target.ts",
    "docs/schemas/examples/valid-wechat-full.json",
    "docs/C5-App-Spec-阶段C.md"
  ];

  for (const rel of required) {
    if (!fs.existsSync(path.join(root, rel))) {
      console.error(`❌ 缺少 ${rel}`);
      process.exit(1);
    }
    console.log(`✓ ${rel}`);
  }

  const schema = fs.readFileSync(
    path.join(root, "docs/schemas/app-spec-v0.1.schema.json"),
    "utf8"
  );
  for (const token of [
    "wechatMiniProgram",
    "loginMethod",
    "subPackages",
    '"supabase", "nest", "custom"'
  ]) {
    if (!schema.includes(token)) {
      console.error(`❌ Schema 缺少 ${token}`);
      process.exit(1);
    }
    console.log(`✓ Schema 含 ${token}`);
  }

  console.log("\n✅ C5 静态接线通过");
}

function checkRuntime() {
  console.log("\n══ C5 运行时探针 ══\n");

  const fullPath = path.join(
    root,
    "docs/schemas/examples/valid-wechat-full.json"
  );
  const full = JSON.parse(fs.readFileSync(fullPath, "utf8"));
  const validation = validateAppSpec(full);
  if (!validation.ok) {
    console.error("❌ valid-wechat-full.json 未通过 Schema");
    for (const err of validation.errors) console.error(`   - ${err}`);
    process.exit(1);
  }
  console.log("✓ valid-wechat-full.json 通过 Schema");

  const partial = {
    targets: { wechatMiniProgram: { enabled: true } },
    screens: [
      { id: "home", title: "首页", type: "tabRoot", children: ["main_list"] },
      { id: "main_list", title: "列表", type: "list" }
    ],
    navigation: { tabs: ["main_list"] }
  };
  const minimal = buildMinimalSpecFromProject({
    id: "00000000-0000-4000-8000-000000000002",
    title: "探针应用"
  });
  const merged = mergeSpecWithMinimal(partial, minimal);
  const mergedTargets =
    typeof merged.targets === "object" && merged.targets !== null
      ? (merged.targets as Record<string, unknown>)
      : {};
  const wechat = normalizeWechatMiniProgramTarget(
    mergedTargets.wechatMiniProgram,
    (minimal.targets as Record<string, unknown>)?.wechatMiniProgram,
    merged.navigation?.tabs
  );

  if (!wechat.enabled || wechat.tabBar.length < 2) {
    console.error("❌ wechatMiniProgram 归一化失败");
    process.exit(1);
  }
  if (wechat.loginMethod !== "wechat") {
    console.error(`❌ loginMethod 期望 wechat，实际 ${wechat.loginMethod}`);
    process.exit(1);
  }
  console.log(`✓ wechatMiniProgram tabBar=${JSON.stringify(wechat.tabBar)}`);

  const backend = resolveBackendTarget(merged);
  if (backend.provider !== "supabase" || !backend.codegenSupported) {
    console.error("❌ BackendTarget supabase 解析失败");
    process.exit(1);
  }
  console.log(`✓ BackendTarget provider=${backend.provider}`);

  const tabIds = resolveWechatTabIds(merged);
  if (!tabIds.includes("profile")) {
    console.error("❌ resolveWechatTabIds 应补 profile");
    process.exit(1);
  }
  console.log(`✓ resolveWechatTabIds=${JSON.stringify(tabIds)}`);
}

async function checkWechatCodegen() {
  console.log("\n══ C5 小程序生成探针 ══\n");

  const fullPath = path.join(
    root,
    "docs/schemas/examples/valid-wechat-full.json"
  );
  const spec = JSON.parse(fs.readFileSync(fullPath, "utf8"));
  const { outputDir } = await generateWechatProject(spec);

  const appJson = JSON.parse(
    fs.readFileSync(path.join(outputDir, "app.json"), "utf8")
  ) as { subPackages?: Array<{ root: string; pages: string[] }> };

  if (!Array.isArray(appJson.subPackages) || appJson.subPackages.length === 0) {
    console.error("❌ app.json 缺少 subPackages");
    process.exit(1);
  }
  console.log(`✓ app.json subPackages=${JSON.stringify(appJson.subPackages)}`);

  const backendMd = fs.readFileSync(path.join(outputDir, "BACKEND.md"), "utf8");
  if (!backendMd.includes("BackendTarget") || !backendMd.includes("supabase")) {
    console.error("❌ BACKEND.md 缺少 BackendTarget 说明");
    process.exit(1);
  }
  console.log("✓ BACKEND.md 已生成");

  await fs.promises.rm(path.dirname(outputDir), { recursive: true, force: true });
  console.log("\n✅ C5 小程序生成探针通过");
}

async function main() {
  checkStatic();
  checkRuntime();
  await checkWechatCodegen();
  console.log("\n✅ verify:c5:app-spec 全部通过");
}

main().catch((err) => {
  console.error("❌", err instanceof Error ? err.message : err);
  process.exit(1);
});
