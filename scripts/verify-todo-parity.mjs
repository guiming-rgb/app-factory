/**
 * E2 三栈待办 parity 探针
 * npm run verify:todo:parity
 */
import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";

const root = process.cwd();
const spec = "docs/schemas/examples/valid-todo-minimal.json";

function assert(cond, msg) {
  if (!cond) {
    console.error(`❌ ${msg}`);
    process.exit(1);
  }
}

function runCodegen(script, outDir) {
  const r = spawnSync(
    "npx",
    ["tsx", script, "--spec", spec, "--out", outDir],
    { cwd: root, encoding: "utf8" }
  );
  if (r.status !== 0) {
    console.error(r.stderr || r.stdout);
    process.exit(1);
  }
}

console.log("══ E2 待办 parity ══\n");

runCodegen("scripts/codegen-harmony.ts", "/tmp/app-factory-todo-harmony");
const harmonyIndex = fs.readFileSync(
  "/tmp/app-factory-todo-harmony/entry/src/main/ets/pages/Index.ets",
  "utf8"
);
for (const k of ["addTodo", "TextInput", "persistTodos", "preferences"]) {
  assert(harmonyIndex.includes(k), `harmony 缺少 ${k}`);
}
console.log("✓ 鸿蒙待办 Index.ets");

runCodegen("scripts/codegen-flutter.ts", "/tmp/app-factory-todo-flutter");
const flutterTodo = fs.readFileSync(
  "/tmp/app-factory-todo-flutter/lib/features/todo_list/presentation/todo_list_page.dart",
  "utf8"
);
for (const k of ["TodoListPage", "_addTodo", "TextField", "SharedPreferences"]) {
  assert(flutterTodo.includes(k), `flutter 缺少 ${k}`);
}
console.log("✓ Flutter todo_list_page.dart");

runCodegen("scripts/codegen-wechat.ts", "/tmp/app-factory-todo-wechat");
const wechatJs = fs.readFileSync(
  "/tmp/app-factory-todo-wechat/pages/index/index.js",
  "utf8"
);
const wechatWxml = fs.readFileSync(
  "/tmp/app-factory-todo-wechat/pages/index/index.wxml",
  "utf8"
);
for (const k of ["onAdd", "onDelete", "todos", "saveTodos", "getStorageSync"]) {
  assert(wechatJs.includes(k), `wechat js 缺少 ${k}`);
}
assert(wechatWxml.includes("todo-input"), "wechat wxml 缺少待办输入");
console.log("✓ 小程序 index 待办页");

console.log("\n✅ verify:todo:parity 通过");
