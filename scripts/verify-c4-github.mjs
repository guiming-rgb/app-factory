/**
 * C4 GitHub OAuth + 产物 push 静态验收
 * npm run verify:c4:github
 */
import fs from "fs";
import path from "path";

const root = process.cwd();

function checkStatic() {
  console.log("══ C4 GitHub OAuth + push（静态）══\n");

  const required = [
    "sql/migrations/20260531_c4_github_connections.sql",
    "lib/github/config.ts",
    "lib/github/oauth-state.ts",
    "lib/github/connections-server.ts",
    "lib/github/push-artifact.ts",
    "lib/github/unzip-artifact.ts",
    "app/api/github/status/route.ts",
    "app/api/github/oauth/start/route.ts",
    "app/api/github/oauth/callback/route.ts",
    "app/api/github/disconnect/route.ts",
    "app/api/projects/[id]/codegen/runs/[runId]/github-push/route.ts",
    "components/GitHubConnectButton.tsx",
    "components/CodegenPanel.tsx",
    "scripts/apply-c4-github-migration.mjs"
  ];

  for (const rel of required) {
    if (!fs.existsSync(path.join(root, rel))) {
      console.error(`❌ 缺少 ${rel}`);
      process.exit(1);
    }
    console.log(`✓ ${rel}`);
  }

  const pushRoute = fs.readFileSync(
    path.join(
      root,
      "app/api/projects/[id]/codegen/runs/[runId]/github-push/route.ts"
    ),
    "utf8"
  );
  const panel = fs.readFileSync(
    path.join(root, "components/CodegenPanel.tsx"),
    "utf8"
  );
  const oauthStart = fs.readFileSync(
    path.join(root, "app/api/github/oauth/start/route.ts"),
    "utf8"
  );
  const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));

  for (const [token, haystack] of [
    ["pushArtifactZipToGitHub", pushRoute],
    ["createGitHubOAuthState", oauthStart],
    ["githubRepoUrl", `${pushRoute}\n${panel}`],
    ["推 GitHub", panel]
  ]) {
    if (!haystack.includes(token)) {
      console.error(`❌ 缺少关键接线: ${token}`);
      process.exit(1);
    }
    console.log(`✓ 含 ${token}`);
  }

  if (!pkg.dependencies?.["@octokit/rest"]) {
    console.error("❌ package.json 缺少 @octokit/rest");
    process.exit(1);
  }
  console.log("✓ dependency @octokit/rest");

  console.log("\n✅ C4 静态接线通过");
  console.log(
    "   维护者：配置 GITHUB_OAUTH_CLIENT_ID/SECRET → npm run db:apply:c4-github"
  );
}

function checkRepoNameSanitizer() {
  console.log("\n══ C4 repo 名探针 ══\n");
  const mod = fs.readFileSync(
    path.join(root, "lib/github/push-artifact.ts"),
    "utf8"
  );
  if (!mod.includes("sanitizeRepoName")) {
    console.error("❌ push-artifact 缺少 sanitizeRepoName");
    process.exit(1);
  }
  console.log("✓ sanitizeRepoName 存在");
}

checkStatic();
checkRepoNameSanitizer();
console.log("\n✅ verify:c4:github 全部通过");
