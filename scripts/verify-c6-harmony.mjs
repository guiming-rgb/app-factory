/**
 * npm run verify:c6:harmony
 */
import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";

const root = process.cwd();

function checkStatic() {
  console.log("══ C6 Harmony codegen（静态）══\n");
  const required = [
    "templates/harmony-minimal/AppScope/app.json5",
    "templates/harmony-minimal/entry/src/main/module.json5",
    "templates/harmony-minimal/entry/src/main/ets/pages/Index.ets",
    "templates/harmony-minimal/entry/src/main/ets/entryability/EntryAbility.ets",
    "lib/harmony-codegen/generate.ts",
    "lib/codegen/execute-harmony.ts",
    "lib/sandbox/harmony-structure.ts",
    "lib/inngest/codegen-functions.ts",
    "app/api/projects/[id]/codegen/harmony/route.ts",
    "app/api/projects/[id]/export-harmony/route.ts",
    "components/DownloadHarmonyButton.tsx",
    "scripts/codegen-harmony.ts",
    "scripts/verify-harmony-template.mjs",
    "sql/migrations/20260528_codegen_harmony_target.sql"
  ];
  for (const rel of required) {
    if (!fs.existsSync(path.join(root, rel))) {
      console.error(`❌ 缺少 ${rel}`);
      process.exit(1);
    }
    console.log(`✓ ${rel}`);
  }
}

function runCodegenProbe() {
  console.log("\n══ C6 生成探针 ══\n");
  const r = spawnSync(
    "npx",
    [
      "tsx",
      "scripts/codegen-harmony.ts",
      "--spec",
      "docs/schemas/examples/valid-minimal.json",
      "--out",
      "/tmp/app-factory-harmony-verify"
    ],
    { cwd: root, encoding: "utf8" }
  );
  if (r.status !== 0) {
    console.error(r.stderr || r.stdout);
    process.exit(1);
  }
  console.log(r.stdout.trim());

  const r2 = spawnSync(
    "node",
    ["scripts/verify-harmony-template.mjs", "/tmp/app-factory-harmony-verify"],
    { cwd: root, encoding: "utf8" }
  );
  if (r2.status !== 0) {
    console.error(r2.stderr || r2.stdout);
    process.exit(1);
  }
  console.log(r2.stdout.trim());

  console.log("\n══ C6 待办清单探针 ══\n");
  const todoSpec = "docs/schemas/examples/valid-todo-minimal.json";
  const todoOut = "/tmp/app-factory-harmony-todo-verify";
  const r3 = spawnSync(
    "npx",
    ["tsx", "scripts/codegen-harmony.ts", "--spec", todoSpec, "--out", todoOut],
    { cwd: root, encoding: "utf8" }
  );
  if (r3.status !== 0) {
    console.error(r3.stderr || r3.stdout);
    process.exit(1);
  }
  const indexEts = fs.readFileSync(
    path.join(todoOut, "entry/src/main/ets/pages/Index.ets"),
    "utf8"
  );
  for (const needle of ["addTodo", "deleteTodo", "TextInput", "ForEach"]) {
    if (!indexEts.includes(needle)) {
      console.error(`❌ 待办 Index.ets 缺少 ${needle}`);
      process.exit(1);
    }
    console.log(`✓ Index.ets 含 ${needle}`);
  }
}

checkStatic();
runCodegenProbe();
console.log("\n✅ verify:c6:harmony 全部通过");
