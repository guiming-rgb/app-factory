import { NextRequest, NextResponse } from "next/server";

import { getApiUser, unauthorizedResponse } from "@/lib/auth/api-user";
import { isAuthEnabled } from "@/lib/auth-config";
import {
  CODEGEN_PUSH_TARGETS,
  ensureCompletedCodegenRun,
  findLatestCompletedRuns
} from "@/lib/codegen/ensure-completed-runs";
import { guardProjectAccess } from "@/lib/auth/require-project-access";
import { isGitHubPushConfigured } from "@/lib/github/push-token";
import { pushCodegenRunToGitHub } from "@/lib/github/push-codegen-run";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    if (!isAuthEnabled()) {
      return NextResponse.json({ error: "Auth 未启用" }, { status: 503 });
    }
    if (!isGitHubPushConfigured()) {
      return NextResponse.json(
        { error: "GitHub 推送未配置（OAuth 或 GITHUB_PAT）" },
        { status: 503 }
      );
    }

    const user = await getApiUser();
    if (!user) {
      return unauthorizedResponse();
    }

    const denied = await guardProjectAccess(params.id);
    if (denied) {
      return denied;
    }

    const body = (await req.json().catch(() => ({}))) as {
      ensure?: boolean;
    };
    const ensure = body.ensure !== false;

    const results: Array<{
      target: string;
      runId: string;
      repoUrl: string;
      created?: boolean;
    }> = [];
    const errors: Array<{ target: string; error: string }> = [];

    for (const target of CODEGEN_PUSH_TARGETS) {
      try {
        let run = (await findLatestCompletedRuns(params.id))[target];
        let created = false;
        if (!run && ensure) {
          run = await ensureCompletedCodegenRun({
            projectId: params.id,
            target
          });
          created = true;
        }
        if (!run) {
          errors.push({ target, error: "无 completed run" });
          continue;
        }
        const pushed = await pushCodegenRunToGitHub({
          userId: user.id,
          projectId: params.id,
          runId: run.id
        });
        results.push({
          target,
          runId: run.id,
          repoUrl: pushed.push.repoUrl,
          ...(created ? { created: true } : {})
        });
      } catch (e) {
        errors.push({
          target,
          error: e instanceof Error ? e.message : String(e)
        });
      }
    }

    const ok = results.length > 0 && errors.length === 0;
    return NextResponse.json({
      ok,
      pushed: results,
      errors: errors.length ? errors : undefined
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "三栈 push 失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
