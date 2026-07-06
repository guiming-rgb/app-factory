/**
 * 工作区成员管理 API
 *
 * GET    /api/workspaces/:id/members               — 列出成员
 * POST   /api/workspaces/:id/members               — 添加成员（owner/admin only）
 * DELETE /api/workspaces/:id/members?userId=xxx    — 移除成员（owner/admin only）
 */
import { NextRequest, NextResponse } from "next/server";

import { getApiUser, unauthorizedResponse } from "@/lib/auth/api-user";
import { isAuthEnabled } from "@/lib/auth-config";
import { requireWorkspaceMember } from "@/lib/auth/require-workspace-member";
import {
  addMember,
  checkPermission,
  getMembers,
  removeMember,
} from "@/lib/workspace/team-service";

export const runtime = "nodejs";

/**
 * GET: 获取工作区成员列表。
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

    const memberAuth = await requireWorkspaceMember(workspaceId);
    if (!memberAuth.ok) {
      return memberAuth.response;
    }

    const members = await getMembers(workspaceId);

    return NextResponse.json({ members });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "查询成员列表失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST: 添加成员。
 * 仅 owner/admin 可操作。
 * Body: { userId: string, role: string }
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
    const canAdd = await checkPermission(workspaceId, currentUserId, "member:add");
    if (!canAdd) {
      return NextResponse.json(
        { error: "没有权限添加成员" },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "请求体必需包含 userId 和 role" },
        { status: 400 }
      );
    }

    const { userId, role } = body as Record<string, unknown>;

    if (typeof userId !== "string" || !userId.trim()) {
      return NextResponse.json(
        { error: "userId 不能为空" },
        { status: 400 }
      );
    }

    const validRoles = ["admin", "editor", "viewer"];
    const roleStr = typeof role === "string" ? role.toLowerCase() : "editor";
    if (!validRoles.includes(roleStr)) {
      return NextResponse.json(
        {
          error: `role 必须为 ${validRoles.join("、")} 之一`,
        },
        { status: 400 }
      );
    }

    await addMember(workspaceId, userId, roleStr as "admin" | "editor" | "viewer");

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "添加成员失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * DELETE: 移除成员。
 * 仅 owner/admin 可操作。
 * Query: ?userId=xxx
 */
export async function DELETE(
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
    const canRemove = await checkPermission(
      workspaceId,
      currentUserId,
      "member:remove"
    );
    if (!canRemove) {
      return NextResponse.json(
        { error: "没有权限移除成员" },
        { status: 403 }
      );
    }

    const targetUserId = req.nextUrl.searchParams.get("userId");
    if (!targetUserId) {
      return NextResponse.json(
        { error: "请提供要移除的用户 ID（?userId=xxx）" },
        { status: 400 }
      );
    }

    // 不能移除自己（owner 应使用 transferOwnership 后再离开）
    if (targetUserId === currentUserId) {
      return NextResponse.json(
        { error: "不能移除自己，如需转让所有权请使用其他接口" },
        { status: 400 }
      );
    }

    await removeMember(workspaceId, targetUserId);

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "移除成员失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
