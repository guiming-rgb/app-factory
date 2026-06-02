import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { getGlobalQualityStats } from "@/lib/codegen/quality-score";

export const runtime = "nodejs";

/**
 * P2: 数据导出（CSV/JSON）
 * GET /api/data-export?format=csv&type=usage|quality
 */
export async function GET(req: NextRequest) {
  try {
    const format = req.nextUrl.searchParams.get("format") || "json";
    const type = req.nextUrl.searchParams.get("type") || "usage";
    const supabase = getSupabaseAdmin();

    if (type === "quality") {
      const quality = await getGlobalQualityStats();
      return NextResponse.json(quality);
    }

    // 导出 usage_logs
    const { data } = await supabase
      .from("usage_logs")
      .select("project_id, agent_code, event_type, duration_ms, total_tokens, model_name, created_at")
      .eq("event_type", "llm_call")
      .order("created_at", { ascending: false })
      .limit(1000);

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
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
