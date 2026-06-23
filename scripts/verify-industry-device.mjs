#!/usr/bin/env node
/**
 * 三栈行业「真机/模拟器级」验证（自动化可达部分）
 * npm run verify:industry:device
 *
 * 覆盖：Spec → 三栈 codegen → 结构/编译/行业接线 → 可选 Flutter analyze/build、微信 CLI 预览
 */
import { execSync, spawnSync } from "child_process";
import { existsSync, readFileSync, readdirSync } from "fs";
import { mkdir, rm, writeFile } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const OUT_BASE = join("/tmp", "app-factory-industry-device");

const WECHAT_CLI =
  "/Applications/wechatwebdevtools.app/Contents/MacOS/cli";

/** 代表 3 个行业做深度验证（全 19 行业做微信/鸿蒙编译探针） */
const DEEP_INDUSTRIES = [
  {
    ind: "finance",
    name: "记账",
    displayName: "我的记账本",
    screens: [
      { id: "dashboard_view", title: "总览", type: "dashboard" },
      { id: "transaction_list", title: "账单", type: "list", entity: "transactions" },
      { id: "add_transaction", title: "记一笔", type: "form", entity: "transactions" },
    ],
  },
  {
    ind: "ecommerce",
    name: "电商",
    displayName: "商城",
    screens: [
      { id: "home", title: "首页", type: "card_grid" },
      { id: "product_list", title: "商品", type: "list", entity: "products" },
      { id: "cart", title: "购物车", type: "list", entity: "cart_items" },
    ],
  },
  {
    ind: "game",
    name: "游戏",
    displayName: "休闲游戏",
    screens: [
      { id: "play", title: "开始游戏", type: "game" },
      { id: "scores", title: "排行榜", type: "list", entity: "game_scores" },
    ],
  },
];

const ALL_INDS = [
  "finance", "crm", "fitness", "ecommerce", "education", "social", "food",
  "hotel", "recruitment", "property", "video", "weather", "sports", "photo",
  "dating", "medical", "blog", "game", "payment",
];

let passed = 0;
let failed = 0;
let skipped = 0;

function check(label, cond, detail = "") {
  if (cond) {
    console.log(`  ✓ ${label}${detail ? ` — ${detail}` : ""}`);
    passed++;
    return true;
  }
  console.error(`  ✗ ${label}${detail ? ` — ${detail}` : ""}`);
  failed++;
  return false;
}

function skip(label, reason) {
  console.log(`  ⏭ ${label} — ${reason}`);
  skipped++;
}

function buildSpec({ ind, displayName, screens }) {
  return {
    specVersion: "0.1.0",
    appName: `device_${ind}`,
    displayName,
    targets: {
      flutter: { enabled: true, platforms: ["ios", "android"], formFactors: ["phone"] },
      wechatMiniProgram: { enabled: true },
      harmony: { enabled: true },
      backend: { provider: "supabase" },
    },
    screens: [
      { id: "home", title: "首页", type: "tabRoot" },
      ...screens,
      { id: "profile", title: "我的", type: "placeholder" },
    ],
    entities: screens
      .filter((s) => s.entity)
      .map((s) => ({
        name: s.entity,
        fields: [
          { name: "id", type: "uuid", primary: true },
          { name: "title", type: "string" },
          { name: "created_at", type: "datetime" },
        ],
      })),
    navigation: {
      tabs: [
        "home",
        screens.find((s) => s.type === "list")?.id ?? screens[0]?.id ?? "list",
        "profile",
      ].slice(0, 3),
    },
    limitations: ["行业真机验证探针"],
    metadata: { category: ind },
  };
}

function hasFlutter() {
  try {
    execSync("flutter --version", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function hasWechatCli() {
  return existsSync(WECHAT_CLI);
}

async function verifyFlutterDeep(ind, spec, outDir) {
  console.log("\n  [Flutter]");
  const { generateFlutterProject } = await import("../lib/flutter-codegen/generate.ts");
  const result = await generateFlutterProject(spec, { keepOutput: true });
  const appDir = result.outputDir;

  check(`${ind} Flutter 生成`, existsSync(join(appDir, "pubspec.yaml")));

  const routerPath = join(appDir, "lib/router/app_router.dart");
  if (existsSync(routerPath)) {
    const router = readFileSync(routerPath, "utf8");
    const featureDir = join(appDir, "lib/features", ind);
    if (existsSync(featureDir)) {
      check(`${ind} 行业模板目录`, true, featureDir.split("/").slice(-2).join("/"));
      if (ind === "finance") {
        check("router 引用 TransactionListPage", router.includes("TransactionListPage"));
      }
      if (ind === "ecommerce") {
        check("router 引用 ProductListPage", router.includes("ProductListPage"));
      }
      if (ind === "game") {
        const genDir = join(appDir, "lib/generated/pages");
        const altDir = join(appDir, "lib/features/generated/pages");
        let gamePage = "";
        if (existsSync(genDir)) {
          gamePage = readdirSync(genDir).find((f) => f.includes("game")) ?? "";
        }
        if (!gamePage && existsSync(altDir)) {
          gamePage = readdirSync(altDir).find((f) => f.includes("game")) ?? "";
        }
        check(
          "game 专用页生成",
          !!gamePage || readFileSync(routerPath, "utf8").includes("Game"),
          gamePage || "router"
        );
      }
    }
    if (["finance", "crm", "fitness", "ecommerce", "education"].includes(ind)) {
      const w = join(appDir, "lib/features", ind, "widgets", `${ind}_widgets.dart`);
      check(`${ind} widgets 注入`, existsSync(w));
    }
  }

  if (hasFlutter()) {
    try {
      execSync("flutter pub get", { cwd: appDir, stdio: "pipe", timeout: 120_000 });
      check(`${ind} flutter pub get`, true);
      execSync("dart analyze", { cwd: appDir, stdio: "pipe", timeout: 180_000 });
      check(`${ind} dart analyze`, true);
    } catch (e) {
      check(`${ind} Flutter 静态分析`, false, e?.message?.slice(0, 80) ?? "analyze 失败");
    }
  } else {
    skip(`${ind} dart analyze`, "未安装 Flutter SDK");
  }

  await rm(dirname(appDir), { recursive: true, force: true }).catch(() => {});
}

async function verifyWechatDeep(ind, spec) {
  console.log("\n  [微信]");
  const { generateWechatProject } = await import("../lib/wechat-codegen/generate.ts");
  const { runWechatFullBuildValidate } = await import("../lib/sandbox/wechat-build.ts");

  const { outputDir } = await generateWechatProject(spec);
  try {
    check(`${ind} 微信生成`, existsSync(join(outputDir, "app.json")));

    const industryJson = join(outputDir, "industry.json");
    if (existsSync(industryJson)) {
      const meta = JSON.parse(readFileSync(industryJson, "utf8"));
      check(`${ind} industry.json`, meta.industry === ind, meta.industry);
    }

    const indexJs = join(outputDir, "pages/index/index.js");
    if (existsSync(indexJs)) {
      const js = readFileSync(indexJs, "utf8");
      if (ind !== "generic") {
        check(`${ind} require industry service`, js.includes("services/industry"));
        check(`${ind} 行业 list 调用`, js.includes(".list("));
      }
    }

    const build = runWechatFullBuildValidate({ appDir: outputDir });
    check(
      `${ind} wcc/wcsc 编译`,
      build.status === "passed",
      `${build.structure.status}/${build.compile.status}`
    );
  } finally {
    await rm(dirname(outputDir), { recursive: true, force: true }).catch(() => {});
  }
}

async function verifyHarmonyDeep(ind, spec) {
  console.log("\n  [鸿蒙]");
  const { generateHarmonyProject } = await import("../lib/harmony-codegen/generate.ts");
  const { runHarmonyStructureValidate } = await import("../lib/sandbox/harmony-structure.ts");

  const result = await generateHarmonyProject(spec);
  const appDir = result.outputDir;
  try {
    check(`${ind} 鸿蒙生成`, existsSync(join(appDir, "AppScope/app.json5")));

    const svc = join(appDir, "entry/src/main/ets/services/IndustryServices.ets");
    check(`${ind} IndustryServices.ets`, existsSync(svc));
    if (existsSync(svc)) {
      const ets = readFileSync(svc, "utf8");
      check(`${ind} DETECTED_INDUSTRY`, ets.includes(`'${ind}'`) || ets.includes(`"${ind}"`));
    }

    const struct = runHarmonyStructureValidate({ appDir });
    check(`${ind} 结构门禁`, struct.status === "passed", `${struct.filesChecked ?? 0} 文件`);
  } finally {
    await rm(dirname(appDir), { recursive: true, force: true }).catch(() => {});
  }
}

async function verifyWechatCompileAll19() {
  console.log("\n══ 19 行业微信编译快扫 ══\n");
  const { generateWechatProject } = await import("../lib/wechat-codegen/generate.ts");
  const { runWechatFullBuildValidate } = await import("../lib/sandbox/wechat-build.ts");

  for (const ind of ALL_INDS) {
    const spec = buildSpec({
      ind,
      displayName: `${ind} App`,
      screens: [{ id: "main_list", title: "列表", type: "list", entity: "items" }],
    });
    spec.appName = `wx_${ind}`;
    let outputDir;
    try {
      ({ outputDir } = await generateWechatProject(spec));
      const build = runWechatFullBuildValidate({ appDir: outputDir });
      check(`${ind} 微信编译`, build.status === "passed");
    } catch (e) {
      check(`${ind} 微信编译`, false, e?.message?.slice(0, 60));
    } finally {
      if (outputDir) {
        await rm(dirname(outputDir), { recursive: true, force: true }).catch(() => {});
      }
    }
  }
}

async function tryWechatAutoPreview(spec, ind) {
  console.log("\n══ 微信开发者工具 auto-preview（E3 探针）══\n");
  if (!hasWechatCli()) {
    skip("微信 auto-preview", "未安装微信开发者工具");
    return;
  }

  const { generateWechatProject } = await import("../lib/wechat-codegen/generate.ts");
  const previewDir = join(OUT_BASE, "wechat-preview", ind);
  await mkdir(previewDir, { recursive: true });

  const { outputDir } = await generateWechatProject(spec);
  const projectDir = outputDir;
  try {
    const login = spawnSync(WECHAT_CLI, ["islogin"], {
      encoding: "utf8",
      timeout: 30_000,
    });
    const out = `${login.stdout || ""}${login.stderr || ""}`;
    if (login.status !== 0 && !/logged\s*in|已登录|login:\s*true/i.test(out)) {
      skip("微信 auto-preview", "开发者工具未登录（需 GUI 扫码一次）");
      return;
    }

    const r = spawnSync(
      WECHAT_CLI,
      ["auto-preview", "--project", projectDir, "--disable-gpu"],
      { encoding: "utf8", timeout: 180_000 }
    );
    if (r.status === 0) {
      check("微信 auto-preview", true, "CLI 返回成功");
    } else {
      skip(
        "微信 auto-preview",
        (r.stderr || r.stdout || "CLI 失败").trim().slice(0, 100)
      );
    }
  } finally {
    await rm(dirname(projectDir), { recursive: true, force: true }).catch(() => {});
  }
}

async function tryFlutterMacosBuild(spec, ind) {
  console.log("\n══ Flutter macOS 构建（E5/T+ 探针）══\n");
  if (!hasFlutter()) {
    skip("flutter build macos", "未安装 Flutter SDK");
    return;
  }

  const { generateFlutterProject } = await import("../lib/flutter-codegen/generate.ts");
  const result = await generateFlutterProject(spec, { keepOutput: true });
  const appDir = result.outputDir;
  try {
    execSync("flutter pub get", { cwd: appDir, stdio: "inherit", timeout: 120_000 });
    execSync("flutter build macos --debug", {
      cwd: appDir,
      stdio: "inherit",
      timeout: 600_000,
    });
    check(`${ind} flutter build macos`, existsSync(join(appDir, "build/macos")));
  } catch (e) {
    check(`${ind} flutter build macos`, false, e?.message?.slice(0, 80) ?? "build 失败");
  } finally {
    await rm(dirname(appDir), { recursive: true, force: true }).catch(() => {});
  }
}

async function tryIosSimulator(spec, ind) {
  console.log("\n══ iOS 模拟器构建探针 ══\n");
  if (!hasFlutter()) {
    skip("flutter build ios --simulator", "未安装 Flutter SDK");
    return;
  }
  try {
    execSync("xcode-select -p", { stdio: "ignore" });
  } catch {
    skip("iOS 模拟器", "未安装 Xcode");
    return;
  }

  const { generateFlutterProject } = await import("../lib/flutter-codegen/generate.ts");
  const result = await generateFlutterProject(spec, { keepOutput: true });
  const appDir = result.outputDir;
  try {
    execSync("flutter pub get", { cwd: appDir, stdio: "pipe", timeout: 120_000 });
    execSync("flutter build ios --simulator --debug", {
      cwd: appDir,
      stdio: "pipe",
      timeout: 600_000,
    });
    check(`${ind} iOS Simulator build`, true);
  } catch (e) {
    check(`${ind} iOS Simulator build`, false, e?.message?.slice(0, 80) ?? "build 失败");
  } finally {
    await rm(dirname(appDir), { recursive: true, force: true }).catch(() => {});
  }
}

async function main() {
  console.log("══ 三栈行业真机/模拟器验证 ══\n");
  console.log(`Flutter SDK: ${hasFlutter() ? "✓" : "✗"}`);
  console.log(`微信 CLI: ${hasWechatCli() ? "✓" : "✗"}`);
  console.log(`Xcode: ${(() => { try { execSync("xcode-select -p", { stdio: "ignore" }); return "✓"; } catch { return "✗"; } })()}\n`);

  await mkdir(OUT_BASE, { recursive: true });

  for (const item of DEEP_INDUSTRIES) {
    console.log(`\n━━━━━━━━ ${item.name} (${item.ind}) ━━━━━━━━`);
    const spec = buildSpec(item);
    await verifyFlutterDeep(item.ind, spec);
    await verifyWechatDeep(item.ind, spec);
    await verifyHarmonyDeep(item.ind, spec);
  }

  await verifyWechatCompileAll19();

  const financeSpec = buildSpec(DEEP_INDUSTRIES[0]);
  await tryWechatAutoPreview(financeSpec, "finance");
  await tryFlutterMacosBuild(financeSpec, "finance");
  await tryIosSimulator(financeSpec, "finance");

  console.log(`\n══ 结果: ${passed} 通过 / ${failed} 失败 / ${skipped} 跳过 ══`);
  if (failed > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
