#!/usr/bin/env node
/**
 * P1: emit 行数软门禁
 * 默认 warn（exit 0）；--strict 时超阈值 exit 1
 */
import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const STRICT = process.argv.includes("--strict");

const STACKS = [
  { name: "flutter", dir: "lib/flutter-codegen", glob: /^emit.*\.ts$/ },
  { name: "wechat", dir: "lib/wechat-codegen", glob: /^emit.*\.ts$/ },
  { name: "harmony", dir: "lib/harmony-codegen", glob: /^emit.*\.ts$/ },
];

const FILE_LIMIT = 1000;
const STACK_LIMIT = 5000;

let violations = 0;

for (const stack of STACKS) {
  const dir = path.join(ROOT, stack.dir);
  if (!fs.existsSync(dir)) continue;

  let stackTotal = 0;
  const files = fs.readdirSync(dir).filter((f) => stack.glob.test(f));

  for (const file of files) {
    const full = path.join(dir, file);
    const lines = fs.readFileSync(full, "utf8").split("\n").length;
    stackTotal += lines;
    if (lines > FILE_LIMIT) {
      console.warn(`[check:emit:lines] WARN ${stack.dir}/${file}: ${lines} 行 > ${FILE_LIMIT}`);
      violations++;
    }
  }

  if (stackTotal > STACK_LIMIT) {
    console.warn(`[check:emit:lines] WARN ${stack.name} 栈合计 ${stackTotal} 行 > ${STACK_LIMIT}`);
    violations++;
  } else {
    console.log(`[check:emit:lines] OK ${stack.name}: ${stackTotal} 行`);
  }
}

if (violations > 0 && STRICT) {
  console.error(`[check:emit:lines] FAIL ${violations} 项超阈值（--strict）`);
  process.exit(1);
}

if (violations > 0) {
  console.warn(`[check:emit:lines] ${violations} 项超阈值（软门禁，exit 0）`);
}
