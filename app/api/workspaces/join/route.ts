/**
 * 加入工作区 API
 *
 * POST /api/workspaces/join  — 通过邀请令牌加入工作区
 *
 * Body: { token: string }
 *
 * 流程:
 *   1. 校验令牌有效、未过期
 *   2. 确认当前用户已登录
 *   3. 添加用户为工作区成员
 *   4. 标记邀请为 accepted
 *   5. 返回工作区信息
 */
import { NextRequest, NextResponse } from "next/server";

import { getApiUser, unauthorizedResponse } from "@/lib/auth/api-user";
import { isAuthEnabled } from "@/lib/auth-config";
import { acceptInviteForUser, getWorkspace } from "@/lib/workspace/team-service";

export const runtime = "nodejs";

/**
 * POST: 接受邀请加入工作区。
 *
 * 请求体: { token: string }
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getApiUser();
    if (isAuthEnabled() && !user) {
      return unauthorizedResponse();
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "请求体必需包含 token" },
        { status: 400 }
      );
    }

    const { token } = body as Record<string, unknown>;
    if (typeof token !== "string" || !token.trim()) {
      return NextResponse.json(
        { error: "邀请令牌不能为空" },
        { status: 400 }
      );
    }

    const userId = user?.id ?? "__no_auth__";
    const workspace = await acceptInviteForUser(token.trim(), userId);

    return NextResponse.json({
      ok: true,
      workspace,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "加入工作区失败";

    // 映射友好的 HTTP 状态码
    if (
      message.includes("不存在") ||
      message.includes("无效") ||
      message.includes("过期") ||
      message.includes("无法接受")
    ) {
      return NextResponse.json({ error: message }, { status: 400 });
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * GET: 预览邀请信息（不需要加入）。
 * Query: ?token=xxx
 * 返回工作区名称和邀请信息，供前端确认页面展示。
 */
export async function GET(req: NextRequest) {
  try {
    const token = req.nextUrl.searchParams.get("token");
    if (!token) {
      return NextResponse.json(
        { error: "请提供邀请令牌（?token=xxx）" },
        { status: 400 }
      );
    }

    // 使用 admin client 查询邀请（不校验登录）
    const { getSupabaseAdmin } = await import("@/lib/supabase");
    const { data: invite } = await getSupabaseAdmin()
      .from("workspace_invites")
      .select("*")
      .eq("token", token)
      .maybeSingle();

    if (!invite) {
      return NextResponse.json(
        { error: "邀请不存在或令牌无效" },
        { status: 404 }
      );
    }

    if (invite.status !== "pending") {
      return NextResponse.json(
        { error: `邀请状态为 ${invite.status}，无法接受` },
        { status: 400 }
      );
    }

    if (new Date(invite.expires_at) < new Date()) {
      return NextResponse.json(
        { error: "邀请已过期" },
        { status: 400 }
      );
    }

    // 获取工作区信息
    const workspace = await getWorkspace(invite.workspace_id);
    if (!workspace) {
      return NextResponse.json(
        { error: "工作区不存在" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      invite: {
        id: invite.id,
        email: invite.email,
        role: invite.role,
        expires_at: invite.expires_at,
        created_at: invite.created_at,
      },
      workspace: {
        id: workspace.id,
        name: workspace.name,
        description: workspace.description,
        member_count: workspace.member_count,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "查询邀请失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
