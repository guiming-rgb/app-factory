/**
 * P3-18: GDPR / 个保法 数据删除
 * POST /api/user/delete — 删除当前用户的所有数据
 *
 * 删除范围：
 * - projects（owner_id = 用户）及其关联的 agent_runs、codegen_runs、memories
 * - user_github_connections、user_quotas、user_profiles
 * - Supabase Auth 账号
 */
import { NextResponse } from "next/server";

import { requireAuth } from "@/lib/auth/require-auth";
import { getSupabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const userId = auth.user.id;
  const supabase = getSupabaseAdmin();
  const errors: string[] = [];

  // 1. 获取用户所有项目
  const { data: projects } = await supabase
    .from("projects")
    .select("id")
    .eq("owner_id", userId);

  const projectIds = (projects ?? []).map((p) => p.id);

  // 2. 删除项目关联数据（RLS 已覆盖，但用 service_role 确保完整性）
  for (const pid of projectIds) {
    const tables = ["agent_runs", "codegen_runs", "memories", "spec_versions", "codegen_feedback"];
    for (const table of tables) {
      const { error } = await supabase.from(table).delete().eq("project_id", pid);
      if (error && !/does not exist/i.test(error.message)) {
        errors.push(`${table}/${pid}: ${error.message}`);
      }
    }
  }

  // 3. 删除项目本身
  if (projectIds.length > 0) {
    const { error } = await supabase.from("projects").delete().eq("owner_id", userId);
    if (error) errors.push(`projects: ${error.message}`);
  }

  // 4. 删除用户关联数据
  const userTables = ["user_github_connections", "user_quotas", "share_links"];
  for (const table of userTables) {
    const { error } = await supabase.from(table).delete().eq("user_id", userId);
    if (error && !/does not exist/i.test(error.message)) {
      errors.push(`${table}: ${error.message}`);
    }
  }

  // 5. 删除 workspace 关联
  try {
    await supabase.from("workspace_members").delete().eq("user_id", userId);
    const { data: ownedWs } = await supabase.from("workspaces").select("id").eq("owner_id", userId);
    if ((ownedWs ?? []).length > 0) {
      await supabase.from("workspace_members").delete().in("workspace_id", (ownedWs ?? []).map(w => w.id));
      await supabase.from("workspaces").delete().eq("owner_id", userId);
    }
  } catch (e) {
    errors.push(`workspaces: ${e instanceof Error ? e.message : String(e)}`);
  }

  // 6. 删除 user_profiles
  const { error: profileErr } = await supabase.from("user_profiles").delete().eq("id", userId);
  if (profileErr && !/does not exist/i.test(profileErr.message)) {
    errors.push(`user_profiles: ${profileErr.message}`);
  }

  // 7. 删除 Supabase Auth 账号
  const { error: authErr } = await supabase.auth.admin.deleteUser(userId);
  if (authErr) errors.push(`auth.user: ${authErr.message}`);

  if (errors.length > 0) {
    console.error("[user/delete] 部分删除失败:", errors);
    return NextResponse.json({
      ok: false,
      message: "部分数据删除失败，请联系 support@app-factory.dev",
      errors: errors.slice(0, 10)
    }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    message: "你的所有数据已被删除。感谢使用 App 生产工厂。",
    deletedProjects: projectIds.length
  });
}
