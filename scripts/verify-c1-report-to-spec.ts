/**
 * C1 Report→Spec 收紧验收
 * npm run verify:c1:report-to-spec
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import { buildMinimalSpecFromProject } from "../lib/app-spec/from-project";
import { mergeSpecWithMinimal } from "../lib/app-spec/merge-spec";
import { validateAppSpec } from "../lib/app-spec/validate";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

function checkStatic() {
  console.log("══ C1 Report→Spec 收紧（静态）══\n");

  const required = [
    "lib/app-spec/prompts/report-to-spec.ts",
    "lib/app-spec/from-report.ts",
    "lib/app-spec/normalize-screens.ts",
    "lib/app-spec/normalize-navigation.ts",
    "lib/app-spec/merge-spec.ts",
    "lib/app-spec/format-validation-errors.ts",
    "docs/schemas/examples/llm-partial-id-as-type.json"
  ];

  for (const rel of required) {
    if (!fs.existsSync(path.join(root, rel))) {
      console.error(`❌ 缺少 ${rel}`);
      process.exit(1);
    }
    console.log(`✓ ${rel}`);
  }

  const prompt = fs.readFileSync(
    path.join(root, "lib/app-spec/prompts/report-to-spec.ts"),
    "utf8"
  );
  const fromReport = fs.readFileSync(
    path.join(root, "lib/app-spec/from-report.ts"),
    "utf8"
  );
  const normalize = fs.readFileSync(
    path.join(root, "lib/app-spec/normalize-screens.ts"),
    "utf8"
  );
  const mergeSpec = fs.readFileSync(
    path.join(root, "lib/app-spec/merge-spec.ts"),
    "utf8"
  );
  const nav = fs.readFileSync(
    path.join(root, "lib/app-spec/normalize-navigation.ts"),
    "utf8"
  );
  const formatErrors = fs.readFileSync(
    path.join(root, "lib/app-spec/format-validation-errors.ts"),
    "utf8"
  );

  for (const [token, haystack] of [
    ["禁止**把 screen.id", prompt],
    ["REPORT_SPEC_MAX_ATTEMPTS", prompt],
    ["inferScreenType", normalize],
    ["normalizeSpecNavigation", `${mergeSpec}\n${nav}`],
    ["formatValidationErrorsForLlm", formatErrors]
  ] as const) {
    if (!haystack.includes(token)) {
      console.error(`❌ 缺少关键接线: ${token}`);
      process.exit(1);
    }
    console.log(`✓ 含 ${token}`);
  }

  console.log("\n✅ C1 静态接线通过");
}

function checkNormalizeRuntime() {
  console.log("\n══ C1 归一化运行时探针 ══\n");

  const fixturePath = path.join(
    root,
    "docs/schemas/examples/llm-partial-id-as-type.json"
  );
  const partial = JSON.parse(fs.readFileSync(fixturePath, "utf8"));
  const minimal = buildMinimalSpecFromProject({
    id: "00000000-0000-4000-8000-000000000001",
    title: "少儿足球"
  });

  const merged = mergeSpecWithMinimal(partial, minimal);
  const validation = validateAppSpec(merged);
  if (!validation.ok) {
    console.error("❌ 归一化后仍未通过 Schema：");
    for (const err of validation.errors) {
      console.error(`   - ${err}`);
    }
    process.exit(1);
  }

  const home = merged.screens.find((s) => s.id === "home");
  const profile = merged.screens.find((s) => s.id === "profile");
  const tabs = merged.navigation?.tabs ?? [];

  if (home?.type !== "tabRoot") {
    console.error(`❌ home.type 期望 tabRoot，实际 ${home?.type}`);
    process.exit(1);
  }
  if (profile?.type !== "placeholder") {
    console.error(`❌ profile.type 期望 placeholder，实际 ${profile?.type}`);
    process.exit(1);
  }
  if (tabs.includes("home")) {
    console.error("❌ navigation.tabs 不应包含 tabRoot 的 home");
    process.exit(1);
  }
  if (tabs.length < 2) {
    console.error("❌ navigation.tabs 至少 2 个");
    process.exit(1);
  }

  console.log(`✓ home.type=${home?.type}`);
  console.log(`✓ profile.type=${profile?.type}`);
  console.log(`✓ navigation.tabs=${JSON.stringify(tabs)}`);
  console.log(`✓ appName 修正为 ${merged.appName}`);

  console.log("\n✅ C1 归一化运行时探针通过");
}

function main() {
  checkStatic();
  checkNormalizeRuntime();
  console.log("\n✅ verify:c1:report-to-spec 全部通过");
}

main();
