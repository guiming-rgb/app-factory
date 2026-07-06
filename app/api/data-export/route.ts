import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { getGlobalQualityStats } from "@/lib/codegen/quality-score";
import { requireAuth } from "@/lib/auth/require-auth";
import { requireAdmin } from "@/lib/auth/require-admin";

export const runtime = "nodejs";

/**
 * P2: 数据导出（CSV/JSON） — 需要登录
 * GET /api/data-export?format=csv&type=usage|quality
 */
export async function GET(req: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const format = req.nextUrl.searchParams.get("format") || "json";
    const type = req.nextUrl.searchParams.get("type") || "usage";
    const supabase = getSupabaseAdmin();

    if (type === "quality") {
      const admin = await requireAdmin();
      if (!admin.ok) return admin.response;

      const quality = await getGlobalQualityStats();
      return NextResponse.json(quality);
    }

    const { data: userProjects, error: projectsError } = await supabase
      .from("projects")
      .select("id")
      .eq("owner_id", auth.user.id);

    if (projectsError) {
      return NextResponse.json({ error: projectsError.message }, { status: 500 });
    }

    const projectIds = (userProjects ?? []).map((p) => p.id as string);
    if (projectIds.length === 0) {
      if (format === "csv") {
        const headers = ["project_id", "agent_code", "event_type", "duration_ms", "total_tokens", "model_name", "created_at"];
        return new NextResponse(headers.join(","), {
          headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": `attachment; filename="usage_export_${new Date().toISOString().slice(0, 10)}.csv"`,
          },
        });
      }
      return NextResponse.json({ rows: [], count: 0 });
    }

    const { data, error: usageError } = await supabase
      .from("usage_logs")
      .select("project_id, agent_code, event_type, duration_ms, total_tokens, model_name, created_at")
      .in("project_id", projectIds)
      .eq("event_type", "llm_call")
      .order("created_at", { ascending: false })
      .limit(1000);

    if (usageError) {
      return NextResponse.json({ error: usageError.message }, { status: 500 });
    }

    if (format === "csv") {
      const rows = (data ?? []) as Array<Record<string, unknown>>;
      const headers = ["project_id", "agent_code", "event_type", "duration_ms", "total_tokens", "model_name", "created_at"];
      const csv = [headers.join(","), ...rows.map((r) => headers.map((h) => JSON.stringify(r[h] ?? "")).join(","))].join("\n");

      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="usage_export_${new Date().toISOString().slice(0, 10)}.csv"`,
        },
      });
    }

    return NextResponse.json({ rows: data ?? [], count: (data ?? []).length });
  } catch (err) {
    console.error("[GET /api/data-export]", err);
    return NextResponse.json({ error: "导出数据失败，请稍后重试" }, { status: 500 });
  }
}
