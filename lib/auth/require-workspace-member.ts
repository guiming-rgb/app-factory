import { NextResponse } from "next/server";
import { getApiUser, unauthorizedResponse } from "./api-user";
import { getSupabaseAdmin } from "@/lib/supabase";

export type WorkspaceAuthResult =
  | { ok: false; response: NextResponse }
  | {
      ok: true;
      user: { id: string; email?: string };
      role: string;
    };

/**
 * 校验当前用户是否为 workspace 成员；可选要求 owner/admin 角色。
 */
export async function requireWorkspaceMember(
  workspaceId: string,
  options?: { requireAdminRole?: boolean },
): Promise<WorkspaceAuthResult> {
  const user = await getApiUser();
  if (!user) {
    return { ok: false, response: unauthorizedResponse() };
  }

  const { data: membership, error } = await getSupabaseAdmin()
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !membership) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "您不是此工作区成员" },
        { status: 403 },
      ),
    };
  }

  if (
    options?.requireAdminRole &&
    !["owner", "admin"].includes(membership.role as string)
  ) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "需要工作区管理员权限" },
        { status: 403 },
      ),
    };
  }

  return {
    ok: true,
    user: { id: user.id, email: user.email },
    role: membership.role as string,
  };
}
