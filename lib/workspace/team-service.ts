/**
 * 多租户工作区团队服务
 *
 * 提供 Workspace 的 CRUD、成员管理、RBAC 权限校验与邀请流程。
 * 所有 Supabase 调用使用 admin client（service_role），绕过 RLS 直接操作，
 * 权限校验在应用层通过 checkPermission 完成。
 */
import { randomUUID } from "crypto";
import { getSupabaseAdmin } from "@/lib/supabase";

// ═══════════════════════════════════════════
// 类型定义
// ═══════════════════════════════════════════

export type WorkspaceRole = "owner" | "admin" | "editor" | "viewer";

export type Workspace = {
  id: string;
  name: string;
  description: string;
  owner_id: string;
  logo_url: string | null;
  member_count: number;
  project_count: number;
  subscription_tier: "free" | "pro" | "enterprise";
  created_at: string;
  updated_at: string;
};

export type WorkspaceMember = {
  id: string;
  workspace_id: string;
  user_id: string;
  role: WorkspaceRole;
  joined_at: string;
  /** JOIN 关联用户表后的用户信息（可选，由调用方自行 JOIN） */
  user_email?: string;
  user_name?: string;
  user_avatar_url?: string;
};

export type WorkspaceInvite = {
  id: string;
  workspace_id: string;
  email: string;
  role: Exclude<WorkspaceRole, "owner">;
  token: string;
  invited_by: string | null;
  status: "pending" | "accepted" | "expired" | "cancelled";
  expires_at: string;
  created_at: string;
};

/** 内置操作权限表 */
const ROLE_PERMISSIONS: Record<WorkspaceRole, string[]> = {
  owner: ["*"],
  admin: [
    "workspace:read",
    "workspace:update",
    "workspace:delete",
    "member:read",
    "member:add",
    "member:remove",
    "member:update_role",
    "invite:create",
    "invite:read",
    "invite:cancel",
    "project:read",
    "project:create",
    "project:update",
    "project:delete",
    "spec:edit",
    "codegen:run",
  ],
  editor: [
    "workspace:read",
    "member:read",
    "project:read",
    "project:create",
    "spec:edit",
    "codegen:run",
  ],
  viewer: [
    "workspace:read",
    "member:read",
    "project:read",
  ],
};

// ═══════════════════════════════════════════
// 内部辅助
// ═══════════════════════════════════════════

function now(): string {
  return new Date().toISOString();
}

function generateToken(): string {
  const bytes = randomUUID().replace(/-/g, "");
  const more = randomUUID().replace(/-/g, "");
  return `${bytes}${more}`;
}

// ═══════════════════════════════════════════
// 公开 API
// ═══════════════════════════════════════════

/**
 * 创建工作区，创建者自动成为 owner 角色成员。
 */
export async function createWorkspace(
  name: string,
  ownerId: string,
  description?: string
): Promise<Workspace> {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error("工作区名称不能为空");
  }
  if (trimmed.length > 128) {
    throw new Error("工作区名称不能超过 128 个字符");
  }

  const id = randomUUID();
  const ts = now();

  const { data: workspace, error } = await getSupabaseAdmin()
    .from("workspaces")
    .insert({
      id,
      name: trimmed,
      description: description?.trim() ?? "",
      owner_id: ownerId,
      updated_at: ts,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(`创建工作区失败：${error.message}`);
  }

  // 添加创建者为 owner 成员
  const { error: memberError } = await getSupabaseAdmin()
    .from("workspace_members")
    .insert({
      id: randomUUID(),
      workspace_id: id,
      user_id: ownerId,
      role: "owner",
    });

  if (memberError) {
    // 回滚 workspace
    await getSupabaseAdmin().from("workspaces").delete().eq("id", id);
    throw new Error(`添加创建者为成员失败：${memberError.message}`);
  }

  return workspace as Workspace;
}

/**
 * 获取工作区详情。
 */
export async function getWorkspace(
  id: string
): Promise<Workspace | null> {
  const { data, error } = await getSupabaseAdmin()
    .from("workspaces")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(`查询工作区失败：${error.message}`);
  }

  return data as Workspace | null;
}

/**
 * 列出用户所属的所有工作区。
 */
export async function listUserWorkspaces(
  userId: string
): Promise<Workspace[]> {
  const { data, error } = await getSupabaseAdmin()
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", userId);

  if (error) {
    throw new Error(`查询用户工作区列表失败：${error.message}`);
  }

  if (!data || data.length === 0) {
    return [];
  }

  const ids = data.map((r: { workspace_id: string }) => r.workspace_id);

  const { data: workspaces, error: wsError } = await getSupabaseAdmin()
    .from("workspaces")
    .select("*")
    .in("id", ids)
    .order("updated_at", { ascending: false });

  if (wsError) {
    throw new Error(`获取工作区详情失败：${wsError.message}`);
  }

  return (workspaces ?? []) as Workspace[];
}

/**
 * 获取工作区的所有成员列表（含用户基本信息）。
 */
export async function getMembers(
  workspaceId: string
): Promise<WorkspaceMember[]> {
  const { data, error } = await getSupabaseAdmin()
    .from("workspace_members")
    .select(
      `
      id,
      workspace_id,
      user_id,
      role,
      joined_at
    `
    )
    .eq("workspace_id", workspaceId)
    .order("joined_at", { ascending: true });

  if (error) {
    throw new Error(`查询成员列表失败：${error.message}`);
  }

  // 尝试 JOIN 用户信息
  if (data && data.length > 0) {
    const userIds = data.map((m: WorkspaceMember) => m.user_id);
    try {
      const { data: profiles } = await getSupabaseAdmin()
        .from("profiles")
        .select("id, email, full_name, avatar_url")
        .in("id", userIds);

      const profileMap = new Map(
        (profiles ?? []).map((p: Record<string, unknown>) => [
          p.id as string,
          p,
        ])
      );

      return (data as WorkspaceMember[]).map((m) => ({
        ...m,
        user_email: (profileMap.get(m.user_id)?.email as string) ?? undefined,
        user_name:
          (profileMap.get(m.user_id)?.full_name as string) ?? undefined,
        user_avatar_url:
          (profileMap.get(m.user_id)?.avatar_url as string) ?? undefined,
      }));
    } catch {
      // profiles 表可能不存在，降级返回基础信息
      return data as WorkspaceMember[];
    }
  }

  return [];
}

/**
 * 向工作区添加成员（仅 owner/admin 可操作，由调用方确保权限）。
 */
export async function addMember(
  workspaceId: string,
  userId: string,
  role: WorkspaceRole
): Promise<void> {
  const { error: existing } = await getSupabaseAdmin()
    .from("workspace_members")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .maybeSingle();

  if (existing && existing.code !== "PGRST116") {
    throw new Error(`检查成员存在失败：${existing.message}`);
  }
  if (existing) {
    // 已存在
    return;
  }

  const { error } = await getSupabaseAdmin()
    .from("workspace_members")
    .insert({
      id: randomUUID(),
      workspace_id: workspaceId,
      user_id: userId,
      role,
    });

  if (error) {
    throw new Error(`添加成员失败：${error.message}`);
  }
}

/**
 * 从工作区移除成员（仅 owner/admin 可操作，由调用方确保权限）。
 * 不能移除 owner 角色的用户。
 */
export async function removeMember(
  workspaceId: string,
  userId: string
): Promise<void> {
  // 检查目标是否为 owner
  const { data: member, error: findError } = await getSupabaseAdmin()
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .maybeSingle();

  if (findError) {
    throw new Error(`查找成员失败：${findError.message}`);
  }
  if (!member) {
    throw new Error("该用户不是工作区成员");
  }
  if (member.role === "owner") {
    throw new Error("不能移除工作区所有者，请先转让所有权");
  }

  const { error } = await getSupabaseAdmin()
    .from("workspace_members")
    .delete()
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId);

  if (error) {
    throw new Error(`移除成员失败：${error.message}`);
  }
}

/**
 * 更新成员角色（仅 owner/admin 可操作，由调用方确保权限）。
 */
export async function updateMemberRole(
  workspaceId: string,
  userId: string,
  role: WorkspaceRole
): Promise<void> {
  if (role === "owner") {
    throw new Error("请使用 transferOwnership 转让所有权");
  }

  const { data: member, error: findError } = await getSupabaseAdmin()
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .maybeSingle();

  if (findError) {
    throw new Error(`查找成员失败：${findError.message}`);
  }
  if (!member) {
    throw new Error("该用户不是工作区成员");
  }
  if (member.role === "owner") {
    throw new Error("不能修改所有者的角色");
  }

  const { error } = await getSupabaseAdmin()
    .from("workspace_members")
    .update({ role })
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId);

  if (error) {
    throw new Error(`更新成员角色失败：${error.message}`);
  }
}

/**
 * 创建并发送邀请（仅 owner/admin 可操作，由调用方确保权限）。
 * 生成加密令牌，48 小时后过期。
 */
export async function inviteUser(
  workspaceId: string,
  email: string,
  role: Exclude<WorkspaceRole, "owner">,
  inviterId: string
): Promise<WorkspaceInvite> {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) {
    throw new Error("邮箱不能为空");
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    throw new Error("邮箱格式不正确");
  }

  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
  const token = generateToken();

  const { data, error } = await getSupabaseAdmin()
    .from("workspace_invites")
    .insert({
      id: randomUUID(),
      workspace_id: workspaceId,
      email: normalizedEmail,
      role,
      token,
      invited_by: inviterId,
      expires_at: expiresAt,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(`创建邀请失败：${error.message}`);
  }

  // TODO: 发送邀请邮件（placeholder — 对接 Resend / SendGrid）
  console.log(
    `[workspace:invite] 邀请 ${normalizedEmail} 加入 ${workspaceId}（角色：${role}，令牌：${token}）`
  );

  return data as WorkspaceInvite;
}

/**
 * 通过令牌接受邀请，加入工作区。
 */
export async function acceptInvite(
  inviteToken: string
): Promise<{ workspace: Workspace; userId: string }> {
  const { data: invite, error } = await getSupabaseAdmin()
    .from("workspace_invites")
    .select("*")
    .eq("token", inviteToken)
    .maybeSingle();

  if (error) {
    throw new Error(`查询邀请失败：${error.message}`);
  }
  if (!invite) {
    throw new Error("邀请不存在或令牌无效");
  }

  const inv = invite as WorkspaceInvite;

  if (inv.status !== "pending") {
    throw new Error(`邀请状态为 ${inv.status}，无法接受`);
  }
  if (new Date(inv.expires_at) < new Date()) {
    // 标记为过期
    await getSupabaseAdmin()
      .from("workspace_invites")
      .update({ status: "expired" })
      .eq("id", inv.id);
    throw new Error("邀请已过期");
  }

  // 查找该邮箱的用户（通过 profiles 表或 auth.users）
  // 注意：这里需要调用方传入 userId 或在路由层处理
  // 我们返回 workspace 信息，让上层获取当前用户 ID
  const workspace = await getWorkspace(inv.workspace_id);
  if (!workspace) {
    throw new Error("工作区不存在");
  }

  return { workspace, userId: "" };
}

/**
 * 接受邀请（含用户 ID 的便捷方法）。
 * 由路由层在确认用户已登录后调用。
 */
export async function acceptInviteForUser(
  inviteToken: string,
  userId: string
): Promise<Workspace> {
  const { data: invite, error } = await getSupabaseAdmin()
    .from("workspace_invites")
    .select("*")
    .eq("token", inviteToken)
    .maybeSingle();

  if (error) {
    throw new Error(`查询邀请失败：${error.message}`);
  }
  if (!invite) {
    throw new Error("邀请不存在或令牌无效");
  }

  const inv = invite as WorkspaceInvite;

  if (inv.status !== "pending") {
    throw new Error(`邀请状态为 ${inv.status}，无法接受`);
  }
  if (new Date(inv.expires_at) < new Date()) {
    await getSupabaseAdmin()
      .from("workspace_invites")
      .update({ status: "expired" })
      .eq("id", inv.id);
    throw new Error("邀请已过期");
  }

  // 添加为成员
  await addMember(inv.workspace_id, userId, inv.role);

  // 标记邀请为已接受
  const { error: updateError } = await getSupabaseAdmin()
    .from("workspace_invites")
    .update({ status: "accepted" })
    .eq("id", inv.id);

  if (updateError) {
    console.warn(
      `[workspace:invite] 标记邀请状态失败：${updateError.message}`
    );
  }

  const workspace = await getWorkspace(inv.workspace_id);
  if (!workspace) {
    throw new Error("工作区不存在");
  }

  return workspace;
}

/**
 * 获取工作区待处理的邀请列表。
 */
export async function getPendingInvites(
  workspaceId: string
): Promise<WorkspaceInvite[]> {
  const { data, error } = await getSupabaseAdmin()
    .from("workspace_invites")
    .select("*")
    .eq("workspace_id", workspaceId)
    .in("status", ["pending"])
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`查询邀请列表失败：${error.message}`);
  }

  return (data ?? []) as WorkspaceInvite[];
}

/**
 * 取消邀请。
 */
export async function cancelInvite(
  inviteId: string
): Promise<void> {
  const { error } = await getSupabaseAdmin()
    .from("workspace_invites")
    .update({ status: "cancelled" })
    .eq("id", inviteId);

  if (error) {
    throw new Error(`取消邀请失败：${error.message}`);
  }
}

/**
 * RBAC 权限校验。
 *
 * actions:
 *   - workspace:read / update / delete
 *   - member:read / add / remove / update_role
 *   - invite:create / read / cancel
 *   - project:read / create / update / delete
 *   - spec:edit
 *   - codegen:run
 */
export async function checkPermission(
  workspaceId: string,
  userId: string,
  action: string
): Promise<boolean> {
  const { data: member, error } = await getSupabaseAdmin()
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !member) {
    return false;
  }

  const role = member.role as WorkspaceRole;
  const permissions = ROLE_PERMISSIONS[role];
  if (!permissions) {
    return false;
  }

  // owner 拥有全部权限
  if (permissions.includes("*")) {
    return true;
  }

  return permissions.includes(action);
}

/**
 * 获取成员在工作区中的角色。
 */
export async function getMemberRole(
  workspaceId: string,
  userId: string
): Promise<WorkspaceRole | null> {
  const { data, error } = await getSupabaseAdmin()
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data.role as WorkspaceRole;
}

/**
 * 转让工作区所有权。
 * fromUserId 必须是当前 owner，toUserId 必须是现有成员。
 */
export async function transferOwnership(
  workspaceId: string,
  fromUserId: string,
  toUserId: string
): Promise<void> {
  // 验证 fromUserId 是 owner
  const { data: fromMember, error: fromError } = await getSupabaseAdmin()
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", fromUserId)
    .maybeSingle();

  if (fromError || !fromMember) {
    throw new Error("您不是该工作区成员");
  }
  if (fromMember.role !== "owner") {
    throw new Error("只有 owner 可以转让所有权");
  }

  // 验证 toUserId 是现有成员
  const { data: toMember, error: toError } = await getSupabaseAdmin()
    .from("workspace_members")
    .select("id, role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", toUserId)
    .maybeSingle();

  if (toError || !toMember) {
    throw new Error("目标用户不是工作区成员");
  }

  const ts = now();

  // 使用事务语义：先更新 workspace.owner_id
  const { error: wsError } = await getSupabaseAdmin()
    .from("workspaces")
    .update({ owner_id: toUserId, updated_at: ts })
    .eq("id", workspaceId)
    .eq("owner_id", fromUserId); // 乐观锁：只有当前 owner 匹配时才更新

  if (wsError) {
    throw new Error(`转让工作区失败：${wsError.message}`);
  }

  // 更新角色：旧 owner → admin，新 owner → owner
  await getSupabaseAdmin()
    .from("workspace_members")
    .update({ role: "admin" })
    .eq("workspace_id", workspaceId)
    .eq("user_id", fromUserId);

  await getSupabaseAdmin()
    .from("workspace_members")
    .update({ role: "owner" })
    .eq("workspace_id", workspaceId)
    .eq("user_id", toUserId);
}

/**
 * 更新工作区信息。
 */
export async function updateWorkspace(
  workspaceId: string,
  updates: {
    name?: string;
    description?: string;
    logo_url?: string | null;
  }
): Promise<Workspace> {
  const ts = now();
  const payload: Record<string, unknown> = { updated_at: ts };

  if (updates.name !== undefined) {
    const trimmed = updates.name.trim();
    if (!trimmed) {
      throw new Error("工作区名称不能为空");
    }
    if (trimmed.length > 128) {
      throw new Error("工作区名称不能超过 128 个字符");
    }
    payload.name = trimmed;
  }
  if (updates.description !== undefined) {
    payload.description = updates.description.trim() ?? "";
  }
  if (updates.logo_url !== undefined) {
    payload.logo_url = updates.logo_url;
  }

  const { data, error } = await getSupabaseAdmin()
    .from("workspaces")
    .update(payload)
    .eq("id", workspaceId)
    .select("*")
    .single();

  if (error) {
    throw new Error(`更新工作区失败：${error.message}`);
  }

  return data as Workspace;
}

/**
 * 删除工作区（级联删除所有关联数据）。
 * 仅 owner 可操作。
 */
export async function deleteWorkspace(workspaceId: string): Promise<void> {
  const { error } = await getSupabaseAdmin()
    .from("workspaces")
    .delete()
    .eq("id", workspaceId);

  if (error) {
    throw new Error(`删除工作区失败：${error.message}`);
  }
}

/**
 * 获取工作区中的项目数量。
 */
export async function syncProjectCount(
  workspaceId: string
): Promise<void> {
  const { count, error } = await getSupabaseAdmin()
    .from("projects")
    .select("*", { count: "exact", head: true })
    .eq("workspace_id", workspaceId);

  if (error) {
    console.warn(`[workspace] 同步项目数量失败：${error.message}`);
    return;
  }

  await getSupabaseAdmin()
    .from("workspaces")
    .update({
      project_count: count ?? 0,
      updated_at: now(),
    })
    .eq("id", workspaceId);
}
