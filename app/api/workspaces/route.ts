/**
 * 工作区 API
 *
 * GET  /api/workspaces          — 列出当前用户工作区
 * POST /api/workspaces          — 创建工作区
 */
import { NextRequest, NextResponse } from "next/server";

import { getApiUser, unauthorizedResponse } from "@/lib/auth/api-user";
import { isAuthEnabled } from "@/lib/auth-config";
import {
  createWorkspace,
  listUserWorkspaces,
} from "@/lib/workspace/team-service";

export const runtime = "nodejs";

/**
 * GET: 列出当前用户的所有工作区（含成员数量）。
 */
export async function GET() {
  try {
    const user = await getApiUser();
    if (isAuthEnabled() && !user) {
      return unauthorizedResponse();
    }

    const userId = user?.id ?? "__no_auth__";
    const workspaces = await listUserWorkspaces(userId);

    return NextResponse.json({
      workspaces: workspaces.map((ws) => ({
        id: ws.id,
        name: ws.name,
        description: ws.description,
        owner_id: ws.owner_id,
        logo_url: ws.logo_url,
        member_count: ws.member_count,
        project_count: ws.project_count,
        subscription_tier: ws.subscription_tier,
        created_at: ws.created_at,
        updated_at: ws.updated_at,
      })),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "查询工作区列表失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST: 创建工作区。
 * 创建者自动成为 owner。
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
        { error: "请求体不能为空" },
        { status: 400 }
      );
    }

    const { name, description } = body as Record<string, unknown>;

    if (typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        { error: "工作区名称不能为空" },
        { status: 400 }
      );
    }

    const ownerId = user?.id ?? "__no_auth__";
    const workspace = await createWorkspace(
      name,
      ownerId,
      typeof description === "string" ? description : undefined
    );

    return NextResponse.json({ workspace }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "创建工作区失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
