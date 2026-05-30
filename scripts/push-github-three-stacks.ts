/**
 * D3：三栈 GitHub 自动 push（PAT 或 OAuth 绑定用户）
 * npm run push:github:three-stacks -- <projectId> [--no-ensure]
 */
import "../lib/load-env-local";

import {
  CODEGEN_PUSH_TARGETS,
  ensureCompletedCodegenRun,
  findLatestCompletedRuns
} from "../lib/codegen/ensure-completed-runs";
import { pushCodegenRunToGitHub } from "../lib/github/push-codegen-run";
import { isGitHubPushConfigured } from "../lib/github/push-token";

async function resolvePushUserId(): Promise<string> {
  const bind = process.env.GITHUB_PAT_BIND_USER_ID?.trim();
  if (bind) return bind;

  const email = process.env.V4_TEST_EMAIL?.trim();
  if (!email) {
    throw new Error("缺少 GITHUB_PAT_BIND_USER_ID 或 V4_TEST_EMAIL");
  }

  const { getSupabaseAdmin } = await import("../lib/supabase");
  const { data, error } = await getSupabaseAdmin().auth.admin.listUsers({
    page: 1,
    perPage: 200
  });
  if (error) throw new Error(error.message);
  const user = data.users.find((u) => u.email === email);
  if (!user?.id) {
    throw new Error(`找不到测试用户 ${email}`);
  }
  return user.id;
}

async function main() {
  const args = process.argv.slice(2);
  const ensure = !args.includes("--no-ensure");
  const projectId = args.find((a) => !a.startsWith("--"))?.trim();

  if (!projectId) {
    console.error(
      "用法: npm run push:github:three-stacks -- <projectId> [--no-ensure]"
    );
    process.exit(1);
  }

  if (!isGitHubPushConfigured()) {
    console.error("❌ GitHub push 未配置（GITHUB_PAT 或 OAuth）");
    process.exit(1);
  }

  const userId = await resolvePushUserId();
  console.log("══ 三栈 GitHub push ══\n");
  console.log(`项目: ${projectId}`);
  console.log(`用户: ${userId}`);
  console.log(`ensure: ${ensure}\n`);

  const pushed = [];
  const errors = [];

  for (const target of CODEGEN_PUSH_TARGETS) {
    try {
      let run = (await findLatestCompletedRuns(projectId))[target];
      if (!run && ensure) {
        console.log(`→ ${target}: 无 completed，同步 codegen…`);
        run = await ensureCompletedCodegenRun({ projectId, target });
      }
      if (!run) {
        errors.push({ target, error: "无 completed run" });
        continue;
      }

      console.log(`→ ${target}: push run ${run.id.slice(0, 8)}…`);
      const result = await pushCodegenRunToGitHub({
        userId,
        projectId,
        runId: run.id
      });
      console.log(`✓ ${target}: ${result.push.repoUrl}`);
      pushed.push({ target, url: result.push.repoUrl });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`✗ ${target}: ${msg}`);
      errors.push({ target, error: msg });
    }
  }

  console.log("");
  if (errors.length) {
    console.error(`❌ 失败 ${errors.length}/${CODEGEN_PUSH_TARGETS.length}`);
    process.exit(1);
  }
  console.log(`✅ 三栈 push 完成 (${pushed.length})`);
  for (const p of pushed) {
    console.log(`   ${p.target}: ${p.url}`);
  }
}

main().catch((e) => {
  console.error("❌", e instanceof Error ? e.message : e);
  process.exit(1);
});
