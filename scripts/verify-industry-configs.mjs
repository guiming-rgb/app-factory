#!/usr/bin/env node
/** npm run verify:industry:configs — 19 行业 JSON 配置完整性 */
import { existsSync, readFileSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const CONFIG_DIR = join(ROOT, "config", "industries");
const REQUIRED = [
  "finance","crm","fitness","ecommerce","education","social","food","hotel",
  "recruitment","property","video","weather","sports","photo","dating",
  "medical","blog","game","payment",
];
let passed = 0, failed = 0;
const ok = (l) => { console.log(`  ✓ ${l}`); passed++; };
const fail = (l, d = "") => { console.error(`  ✗ ${l}${d ? " — " + d : ""}`); failed++; };

console.log("══ 行业 JSON 配置门禁 ══\n");
for (const id of REQUIRED) {
  const fp = join(CONFIG_DIR, `${id}.json`);
  if (!existsSync(fp)) { fail(`${id}.json 缺失`); continue; }
  try {
    const cfg = JSON.parse(readFileSync(fp, "utf8"));
    if (cfg.id !== id) fail(`${id} id 字段`);
    else ok(`${id}.json`);
    if (!cfg.serviceName) fail(`${id} serviceName`);
    if (!cfg.tableName) fail(`${id} tableName`);
  } catch (e) { fail(`${id}.json 解析`, e.message); }
}
const rules = join(CONFIG_DIR, "detect-rules.json");
existsSync(rules) ? ok("detect-rules.json") : fail("detect-rules.json");
const sso = join(ROOT, "config", "enterprise", "sso-config.schema.json");
existsSync(sso) ? ok("sso-config.schema.json") : fail("sso-config.schema.json");

// P3 续: 鸿蒙 serviceMethods ↔ INDUSTRY_METHODS parity
const harmonySrc = readFileSync(join(ROOT, "lib/harmony-codegen/emit-industry-services.ts"), "utf8");
for (const id of REQUIRED) {
  const fp = join(CONFIG_DIR, `${id}.json`);
  if (!existsSync(fp)) continue;
  const cfg = JSON.parse(readFileSync(fp, "utf8"));
  const blockRe = new RegExp(id + ":\\s*`([\\s\\S]*?)`,");
  const block = harmonySrc.match(blockRe)?.[1] ?? "";
  const hardcodedMethods = (block.match(/^\s+(\w+):/gm) ?? []).map((m) => m.trim().replace(":", ""));
  const generatedMethods = (cfg.harmonyMethods ?? []).map((m) => m.name);
  const harmonyMethods = [...hardcodedMethods, ...generatedMethods];
  const jsonMethods = cfg.serviceMethods ?? [];
  const missing = jsonMethods.filter((m) => !harmonyMethods.includes(m));
  if (missing.length) {
    fail(`${id} harmony serviceMethods`, `json 缺 harmony 实现: [${missing}]`);
  } else {
    ok(`${id} harmony serviceMethods parity`);
  }
}
console.log(`\n══ 结果: ${passed} 通过 / ${failed} 失败 ══`);
process.exit(failed ? 1 : 0);
