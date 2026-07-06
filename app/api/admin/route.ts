import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getSupabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 管理员 API（全局用户/配额/订阅管理） */
export async function GET(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const supabase = getSupabaseAdmin();
  const type = req.nextUrl.searchParams.get("type") || "users";

  try {
    if (type === "users") {
      const { data, error } = await supabase
        .from("user_quotas")
        .select("*, user_id")
        .order("updated_at", { ascending: false })
        .limit(50);
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ users: data ?? [] });
    }
    if (type === "subscriptions") {
      const { data, error } = await supabase
        .from("subscriptions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ subscriptions: data ?? [] });
    }
    if (type === "stats") {
      const { count: users, error: usersError } = await supabase
        .from("user_quotas")
        .select("*", { count: "exact", head: true });
      if (usersError) {
        return NextResponse.json({ error: usersError.message }, { status: 500 });
      }

      const { count: projects, error: projectsError } = await supabase
        .from("projects")
        .select("*", { count: "exact", head: true });
      if (projectsError) {
        return NextResponse.json({ error: projectsError.message }, { status: 500 });
      }

      const { count: codegen, error: codegenError } = await supabase
        .from("codegen_runs")
        .select("*", { count: "exact", head: true });
      if (codegenError) {
        return NextResponse.json({ error: codegenError.message }, { status: 500 });
      }

      const { count: subs, error: subsError } = await supabase
        .from("subscriptions")
        .select("*", { count: "exact", head: true })
        .eq("tier", "pro");
      if (subsError) {
        return NextResponse.json({ error: subsError.message }, { status: 500 });
      }

      return NextResponse.json({
        stats: {
          users: users ?? 0,
          projects: projects ?? 0,
          codegenRuns: codegen ?? 0,
          proSubscribers: subs ?? 0,
        },
      });
    }
    return NextResponse.json({ error: "无效 type" }, { status: 400 });
  } catch (err) {
    console.error("[GET /api/admin]", err);
    return NextResponse.json({ error: "查询管理数据失败" }, { status: 500 });
  }
}

/** 修改用户配额 */
export async function PATCH(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  try {
    const body = await req.json();
    const { userId, tier, projectsLimit, codegenLimit } = body as Record<string, unknown>;
    if (!userId) return NextResponse.json({ error: "缺少 userId" }, { status: 400 });

    const patch: Record<string, unknown> = {};
    if (typeof tier === "string") patch.tier = tier;
    if (typeof projectsLimit === "number") patch.projects_limit = projectsLimit;
    if (typeof codegenLimit === "number") patch.codegen_limit = codegenLimit;

    // ✅ 校验 tier 值仅允许已知等级
    if (patch.tier && !["free", "pro", "enterprise"].includes(String(patch.tier))) {
      return NextResponse.json({ error: "无效的 tier 值" }, { status: 400 });
    }
    await getSupabaseAdmin().from("user_quotas").upsert({ user_id: userId, ...patch });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[PATCH /api/admin]", err);
    return NextResponse.json({ error: "修改配额失败" }, { status: 500 });
  }
}
