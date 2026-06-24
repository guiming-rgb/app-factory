/**
 * 工作区邀请管理 API
 *
 * POST /api/workspaces/:id/invites   — 创建邀请（owner/admin only）
 * GET  /api/workspaces/:id/invites   — 获取待处理邀请列表（owner/admin only）
 */
import { NextRequest, NextResponse } from "next/server";

import { getApiUser, unauthorizedResponse } from "@/lib/auth/api-user";
import { isAuthEnabled } from "@/lib/auth-config";
import {
  cancelInvite,
  checkPermission,
  getPendingInvites,
  inviteUser,
} from "@/lib/workspace/team-service";

export const runtime = "nodejs";

/**
 * POST: 创建邀请。
 * 仅 owner/admin 可操作。
 * Body: { email: string, role?: string }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getApiUser();
    if (isAuthEnabled() && !user) {
      return unauthorizedResponse();
    }

    const workspaceId = params.id;
    const currentUserId = user?.id ?? "__no_auth__";

    // 权限校验
    const canInvite = await checkPermission(
      workspaceId,
      currentUserId,
      "invite:create"
    );
    if (!canInvite) {
      return NextResponse.json(
        { error: "没有权限创建邀请" },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "请求体必需包含 email" },
        { status: 400 }
      );
    }

    const { email, role } = body as Record<string, unknown>;

    if (typeof email !== "string" || !email.trim()) {
      return NextResponse.json(
        { error: "邮箱不能为空" },
        { status: 400 }
      );
    }

    // 校验邮箱格式
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return NextResponse.json(
        { error: "邮箱格式不正确" },
        { status: 400 }
      );
    }

    const validRoles = ["admin", "editor", "viewer"];
    const roleStr = typeof role === "string" ? role.toLowerCase() : "editor";
    if (!validRoles.includes(roleStr)) {
      return NextResponse.json(
        { error: `role 必须为 ${validRoles.join("、")} 之一` },
        { status: 400 }
      );
    }

    const invite = await inviteUser(
      workspaceId,
      email,
      roleStr as "admin" | "editor" | "viewer",
      currentUserId
    );

    return NextResponse.json({ invite }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "创建邀请失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * GET: 获取待处理邀请列表。
 * 仅 owner/admin 可操作。
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getApiUser();
    if (isAuthEnabled() && !user) {
      return unauthorizedResponse();
    }

    const workspaceId = params.id;
    const currentUserId = user?.id ?? "__no_auth__";

    // 权限校验
    const canRead = await checkPermission(
      workspaceId,
      currentUserId,
      "invite:read"
    );
    if (!canRead) {
      return NextResponse.json(
        { error: "没有权限查看邀请" },
        { status: 403 }
      );
    }

    const invites = await getPendingInvites(workspaceId);

    return NextResponse.json({ invites });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "查询邀请列表失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * PATCH: 取消邀请。
 * 仅 owner/admin 可操作。
 * Body: { inviteId: string }
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getApiUser();
    if (isAuthEnabled() && !user) {
      return unauthorizedResponse();
    }

    const workspaceId = params.id;
    const currentUserId = user?.id ?? "__no_auth__";

    // 权限校验
    const canCancel = await checkPermission(
      workspaceId,
      currentUserId,
      "invite:cancel"
    );
    if (!canCancel) {
      return NextResponse.json(
        { error: "没有权限取消邀请" },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "请求体必需包含 inviteId" },
        { status: 400 }
      );
    }

    const { inviteId } = body as Record<string, unknown>;
    if (typeof inviteId !== "string" || !inviteId.trim()) {
      return NextResponse.json(
        { error: "inviteId 不能为空" },
        { status: 400 }
      );
    }

    await cancelInvite(inviteId);

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "取消邀请失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
