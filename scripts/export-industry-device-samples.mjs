#!/usr/bin/env node
/**
 * 导出三栈行业样本到 tmp/device-samples/（供 DevEco / 微信工具 / Flutter 真机手动验收）
 * npm run export:industry:device-samples
 */
import { mkdir, rm, cp } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "tmp", "device-samples");

const financeSpec = {
  specVersion: "0.1.0",
  appName: "finance_device_sample",
  displayName: "记账本·真机样本",
  targets: {
    flutter: { enabled: true, platforms: ["ios", "android", "macos"], formFactors: ["phone"] },
    wechatMiniProgram: { enabled: true },
    harmony: { enabled: true },
    backend: { provider: "supabase" },
  },
  screens: [
    { id: "home", title: "首页", type: "tabRoot" },
    { id: "dashboard_view", title: "总览", type: "dashboard" },
    { id: "transaction_list", title: "账单", type: "list", entity: "transactions" },
    { id: "add_transaction", title: "记一笔", type: "form", entity: "transactions" },
    { id: "profile", title: "我的", type: "placeholder" },
  ],
  entities: [
    {
      name: "transactions",
      fields: [
        { name: "id", type: "uuid", primary: true },
        { name: "title", type: "string" },
        { name: "amount", type: "float" },
        { name: "created_at", type: "datetime" },
      ],
    },
  ],
  navigation: { tabs: ["home", "transaction_list", "profile"] },
  limitations: ["真机验收样本"],
  metadata: { category: "finance" },
};

async function main() {
  await rm(OUT, { recursive: true, force: true });
  await mkdir(OUT, { recursive: true });

  const { generateFlutterProject } = await import("../lib/flutter-codegen/generate.ts");
  const { generateWechatProject } = await import("../lib/wechat-codegen/generate.ts");
  const { generateHarmonyProject } = await import("../lib/harmony-codegen/generate.ts");

  const flutter = await generateFlutterProject(financeSpec, { keepOutput: true });
  const wechat = await generateWechatProject(financeSpec);
  const harmony = await generateHarmonyProject(financeSpec);

  await cp(flutter.outputDir, join(OUT, "flutter-finance"), { recursive: true });
  await cp(wechat.outputDir, join(OUT, "wechat-finance"), { recursive: true });
  await cp(harmony.outputDir, join(OUT, "harmony-finance"), { recursive: true });

  await rm(dirname(flutter.outputDir), { recursive: true, force: true }).catch(() => {});
  await rm(dirname(wechat.outputDir), { recursive: true, force: true }).catch(() => {});
  await rm(dirname(harmony.outputDir), { recursive: true, force: true }).catch(() => {});

  console.log("✅ 样本已导出到 tmp/device-samples/");
  console.log("  Flutter:  cd tmp/device-samples/flutter-finance && flutter pub get && flutter run -d macos");
  console.log("  微信:     开发者工具 → 导入 tmp/device-samples/wechat-finance");
  console.log("  鸿蒙:     DevEco → Open tmp/device-samples/harmony-finance");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
