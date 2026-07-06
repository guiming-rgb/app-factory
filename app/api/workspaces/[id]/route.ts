/**
 * 工作区详情 API
 *
 * GET    /api/workspaces/:id          — 获取工作区详情 + 成员
 * PUT    /api/workspaces/:id          — 更新名称/描述（owner/admin only）
 * DELETE /api/workspaces/:id          — 删除工作区（owner only）
 */
import { NextRequest, NextResponse } from "next/server";

import { getApiUser, unauthorizedResponse } from "@/lib/auth/api-user";
import { isAuthEnabled } from "@/lib/auth-config";
import { requireWorkspaceMember } from "@/lib/auth/require-workspace-member";
import {
  checkPermission,
  deleteWorkspace,
  getMembers,
  getWorkspace,
  updateWorkspace,
} from "@/lib/workspace/team-service";

export const runtime = "nodejs";

/**
 * GET: 工作区详情 + 成员列表。
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

    const workspace = await getWorkspace(workspaceId);

    if (!workspace) {
      return NextResponse.json({ error: "工作区不存在" }, { status: 404 });
    }

    const members = await getMembers(workspaceId);

    return NextResponse.json({
      workspace,
      members,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "查询工作区失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * PUT: 更新工作区名称/描述。
 * 仅 owner/admin 可操作。
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getApiUser();
    if (isAuthEnabled() && !user) {
      return unauthorizedResponse();
    }

    const workspaceId = params.id;
    const userId = user?.id ?? "__no_auth__";

    // 权限校验
    const canUpdate = await checkPermission(workspaceId, userId, "workspace:update");
    if (!canUpdate) {
      return NextResponse.json(
        { error: "没有权限更新工作区" },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "请求体不能为空" },
        { status: 400 }
      );
    }

    const { name, description, logo_url } = body as Record<string, unknown>;

    // 验证 name
    if (name !== undefined && (typeof name !== "string" || !name.trim())) {
      return NextResponse.json(
        { error: "工作区名称不能为空" },
        { status: 400 }
      );
    }
    if (
      name !== undefined &&
      typeof name === "string" &&
      name.trim().length > 128
    ) {
      return NextResponse.json(
        { error: "工作区名称不能超过 128 个字符" },
        { status: 400 }
      );
    }

    const workspace = await updateWorkspace(workspaceId, {
      name: name as string | undefined,
      description: description as string | undefined,
      logo_url:
        logo_url === null || logo_url === undefined
          ? undefined
          : (logo_url as string),
    });

    return NextResponse.json({ workspace });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "更新工作区失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * DELETE: 删除工作区。
 * 仅 owner 可操作。级联删除所有项目和成员数据。
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getApiUser();
    if (isAuthEnabled() && !user) {
      return unauthorizedResponse();
    }

    const workspaceId = params.id;
    const userId = user?.id ?? "__no_auth__";

    // 仅 owner 可删除
    const canDelete = await checkPermission(workspaceId, userId, "workspace:delete");
    if (!canDelete) {
      return NextResponse.json(
        { error: "仅工作区所有者可以删除工作区" },
        { status: 403 }
      );
    }

    await deleteWorkspace(workspaceId);

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "删除工作区失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
