/**
 * npm run verify:v5:user-profile
 */
import fs from "fs";
import path from "path";

const root = process.cwd();

function checkStatic() {
  console.log("══ V5-10 用户画像（静态）══\n");
  const required = [
    "sql/migrations/20260528_v5_user_profiles.sql",
    "lib/user-profiles/server.ts",
    "app/api/user/profile/route.ts",
    "components/UserProfilePanel.tsx",
    "scripts/apply-v5-user-profiles-migration.mjs"
  ];
  for (const rel of required) {
    if (!fs.existsSync(path.join(root, rel))) {
      console.error(`❌ 缺少 ${rel}`);
      process.exit(1);
    }
    console.log(`✓ ${rel}`);
  }

  const workflow = fs.readFileSync(path.join(root, "lib/workflow.ts"), "utf8");
  const bindings = fs.readFileSync(
    path.join(root, "lib/agents/memory-bindings.ts"),
    "utf8"
  );
  for (const token of [
    "getUserProfileForWorkflow",
    "formatUserProfileForPrompt",
    "userProfileBlock",
    "agentReceivesUserProfile"
  ]) {
    if (!workflow.includes(token) && !bindings.includes(token)) {
      console.error(`❌ 缺少 ${token}`);
      process.exit(1);
    }
    console.log(`✓ 含 ${token}`);
  }
}

checkStatic();
console.log("\n✅ verify:v5:user-profile 通过");
