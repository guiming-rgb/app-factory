import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { getApiUser, unauthorizedResponse } from "@/lib/auth/api-user";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 管理员 API（全局用户/配额/订阅管理） */
export async function GET(req: NextRequest) {
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();

  // 简单管理员检查（可改为 roles 表）
  const adminIds = (process.env.ADMIN_USER_IDS ?? "").split(",").map((s) => s.trim());
  if (!adminIds.includes(user.id)) return NextResponse.json({ error: "无管理员权限" }, { status: 403 });

  const supabase = getSupabaseAdmin();
  const type = req.nextUrl.searchParams.get("type") || "users";

  try {
    if (type === "users") {
      const { data } = await supabase.from("user_quotas").select("*, user_id").order("updated_at", { ascending: false }).limit(50);
      return NextResponse.json({ users: data ?? [] });
    }
    if (type === "subscriptions") {
      const { data } = await supabase.from("subscriptions").select("*").order("created_at", { ascending: false }).limit(50);
      return NextResponse.json({ subscriptions: data ?? [] });
    }
    if (type === "stats") {
      const { count: users } = await supabase.from("user_quotas").select("*", { count: "exact", head: true });
      const { count: projects } = await supabase.from("projects").select("*", { count: "exact", head: true });
      const { count: codegen } = await supabase.from("codegen_runs").select("*", { count: "exact", head: true });
      const { count: subs } = await supabase.from("subscriptions").select("*", { count: "exact", head: true }).eq("tier", "pro");
      return NextResponse.json({ stats: { users: users ?? 0, projects: projects ?? 0, codegenRuns: codegen ?? 0, proSubscribers: subs ?? 0 } });
    }
    return NextResponse.json({ error: "无效 type" }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

/** 修改用户配额 */
export async function PATCH(req: NextRequest) {
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();

  const adminIds = (process.env.ADMIN_USER_IDS ?? "").split(",").map((s) => s.trim());
  if (!adminIds.includes(user.id)) return NextResponse.json({ error: "无管理员权限" }, { status: 403 });

  try {
    const body = await req.json();
    const { userId, tier, projectsLimit, codegenLimit } = body as Record<string, unknown>;
    if (!userId) return NextResponse.json({ error: "缺少 userId" }, { status: 400 });

    const patch: Record<string, unknown> = {};
    if (typeof tier === "string") patch.tier = tier;
    if (typeof projectsLimit === "number") patch.projects_limit = projectsLimit;
    if (typeof codegenLimit === "number") patch.codegen_limit = codegenLimit;

    await getSupabaseAdmin().from("user_quotas").upsert({ user_id: userId, ...patch });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
