#!/usr/bin/env node
/**
 * Phase2 B1: 19 行业 Mustache 门禁
 * npm run verify:p2:all
 */
import { existsSync, readFileSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const CONFIG_DIR = join(ROOT, "config", "industries");

let passed = 0, failed = 0;
const ok = (l) => { console.log(`  ✓ ${l}`); passed++; };
const fail = (l, d = "") => { console.error(`  ✗ ${l}${d ? " — " + d : ""}`); failed++; };

const industries = readdirSync(CONFIG_DIR)
  .filter((f) => f.endsWith(".json") && f !== "detect-rules.json")
  .map((f) => f.replace(".json", ""))
  .sort();

/** 深度三栈生成抽检（其余仅 Mustache 存在性） */
const DEEP_GEN = ["finance", "ecommerce", "medical", "crm", "fitness", "education"];

console.log(`══ P2 全量门禁 — ${industries.length} 行业 Mustache ══\n`);

for (const ind of industries) {
  const cfg = JSON.parse(readFileSync(join(CONFIG_DIR, `${ind}.json`), "utf8"));
  cfg.pilot === true ? ok(`${ind} pilot=true`) : fail(`${ind} pilot flag`);

  const flutterTpl = join(ROOT, "templates/flutter-minimal/lib/core/widgets/industry", `${ind}_widgets.dart.mustache`);
  const wechatWxml = join(ROOT, "templates/wechat-miniprogram-minimal/pages/industry", `${ind}.wxml.mustache`);
  const harmonyEts = join(ROOT, "templates/harmony-minimal/entry/src/main/ets/pages/industry", `${ind}.ets.mustache`);
  for (const [label, fp] of [["flutter", flutterTpl], ["wechat", wechatWxml], ["harmony", harmonyEts]]) {
    existsSync(fp) ? ok(`${ind} ${label} mustache`) : fail(`${ind} ${label} mustache`, fp);
  }
}

if (process.argv.includes("--deep")) {
  const { generateFlutterProject } = await import("../lib/flutter-codegen/generate.ts");
  const { rm } = await import("fs/promises");
  for (const ind of DEEP_GEN) {
    const cfg = JSON.parse(readFileSync(join(CONFIG_DIR, `${ind}.json`), "utf8"));
    const spec = {
      specVersion: "0.1.0",
      appName: `p2all_${ind}`,
      displayName: cfg.displayName,
      targets: { flutter: { enabled: true, platforms: ["ios"], formFactors: ["phone"] }, backend: { provider: "supabase" } },
      screens: [{ id: "home", title: "首页", type: "tabRoot" }, { id: "list", title: "列表", type: "list", entity: cfg.tableName }],
      navigation: { tabs: ["home", "list"] },
      metadata: { category: ind },
      limitations: ["p2 all gate"],
      entities: [{ name: cfg.tableName, fields: [{ name: "title", type: "string" }] }],
    };
    try {
      const r = await generateFlutterProject(spec);
      const w = join(r.outputDir, "lib/core/widgets/industry_widgets.dart");
      existsSync(w) ? ok(`${ind} Flutter Mustache 生成`) : fail(`${ind} Flutter widget 缺失`);
      await rm(r.outputDir, { recursive: true, force: true }).catch(() => {});
    } catch (e) {
      fail(`${ind} Flutter 生成`, e.message);
    }
  }
}

console.log(`\n══ 结果: ${passed} 通过 / ${failed} 失败 ══`);
process.exit(failed ? 1 : 0);
