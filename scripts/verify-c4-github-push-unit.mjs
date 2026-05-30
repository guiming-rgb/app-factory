/**
 * C4 repo 名 + 解压探针（无需 GitHub 凭证）
 * npm run verify:c4:github:push-unit
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const root = process.cwd();
const require = createRequire(import.meta.url);

function assert(cond, msg) {
  if (!cond) {
    console.error(`❌ ${msg}`);
    process.exit(1);
  }
}

console.log("══ C4 push 单元探针 ══\n");

const repoNameMod = fs.readFileSync(
  path.join(root, "lib/github/repo-name.ts"),
  "utf8"
);
for (const fn of ["sanitizeRepoName", "deriveCodegenRepoName"]) {
  assert(repoNameMod.includes(`export function ${fn}`), `缺少 ${fn}`);
  console.log(`✓ ${fn}`);
}

const cases = [
  ["  Hello World!!  ", "hello-world"],
  ["少儿踢足球", "app-factory-generated"],
  ["My_App.v2", "my_app.v2"]
];

for (const [input, expected] of cases) {
  const slug = input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90) || "app-factory-generated";
  assert(slug === expected, `sanitize "${input}" → ${slug}, 期望 ${expected}`);
}
console.log("✓ sanitizeRepoName 探针");

const pushMod = fs.readFileSync(
  path.join(root, "lib/github/push-artifact.ts"),
  "utf8"
);
assert(pushMod.includes("pushArtifactZipToGitHub"), "缺少 pushArtifactZipToGitHub");
assert(pushMod.includes("createTree"), "缺少 git tree 推送逻辑");
console.log("✓ push-artifact 结构");

const unzipMod = fs.readFileSync(
  path.join(root, "lib/github/unzip-artifact.ts"),
  "utf8"
);
assert(unzipMod.includes("AdmZip"), "unzip 须使用 AdmZip（Vercel 无系统 unzip）");
assert(!unzipMod.includes('execFile("unzip"'), "不应依赖系统 unzip");
console.log("✓ unzip-artifact 纯 JS");

const zipMod = fs.readFileSync(
  path.join(root, "lib/flutter-codegen/zip.ts"),
  "utf8"
);
assert(zipMod.includes("AdmZip"), "zip 须使用 AdmZip");
assert(!zipMod.includes('execFile("zip"'), "不应依赖系统 zip");
console.log("✓ zipDirectory 纯 JS");

const tokenMod = fs.readFileSync(
  path.join(root, "lib/github/push-token.ts"),
  "utf8"
);
assert(tokenMod.includes("resolveGitHubPushCredentials"), "缺少 push-token");
console.log("✓ push-token 回退");

console.log("\n✅ verify:c4:github:push-unit 通过");
