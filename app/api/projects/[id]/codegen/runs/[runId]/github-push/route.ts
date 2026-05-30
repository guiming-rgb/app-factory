import { NextRequest, NextResponse } from "next/server";

import { getApiUser, unauthorizedResponse } from "@/lib/auth/api-user";
import { isAuthEnabled } from "@/lib/auth-config";
import { guardProjectAccess } from "@/lib/auth/require-project-access";
import { isGitHubPushConfigured } from "@/lib/github/push-token";
import { pushCodegenRunToGitHub } from "@/lib/github/push-codegen-run";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string; runId: string } }
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
      repoName?: unknown;
    };

    const result = await pushCodegenRunToGitHub({
      userId: user.id,
      projectId: params.id,
      runId: params.runId,
      repoName:
        typeof body.repoName === "string" ? body.repoName : undefined
    });

    return NextResponse.json({
      ok: true,
      push: result.push,
      metadata: result.metadata
    });
  } catch (err: unknown) {
    const code = (err as Error & { code?: string })?.code;
    if (code === "github_not_connected") {
      return NextResponse.json(
        { error: "请先连接 GitHub", code: "github_not_connected" },
        { status: 401 }
      );
    }
    const message = err instanceof Error ? err.message : "GitHub push 失败";
    const status = message.includes("不存在") ? 404 : message.includes("completed") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
