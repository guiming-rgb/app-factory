import { NextRequest, NextResponse } from "next/server";
import { requireProjectOwner } from "@/lib/auth/require-auth";
import { getSupabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireProjectOwner(params.id);
    if (auth.error) return auth.error;

    const body = await req.json().catch(() => ({}));
    const { rating, feedback, runId, category } = body as Record<string, unknown>;

    if (typeof rating !== "number" || rating < 1 || rating > 5) {
      return NextResponse.json({ error: "rating 需为 1-5" }, { status: 400 });
    }

    await getSupabaseAdmin().from("codegen_feedback").insert({
      project_id: params.id,
      run_id: runId || null,
      rating,
      feedback: typeof feedback === "string" ? feedback.slice(0, 2000) : null,
      category: typeof category === "string" ? category : "general",
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[feedback]", err);
    return NextResponse.json({ error: "操作失败，请稍后重试" }, { status: 500 });
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireProjectOwner(params.id);
    if (auth.error) return auth.error;

    const { data } = await getSupabaseAdmin()
      .from("codegen_feedback")
      .select("*")
      .eq("project_id", params.id)
      .order("created_at", { ascending: false })
      .limit(20);

    return NextResponse.json({ feedbacks: data ?? [] });
  } catch (err) {
    console.error("[feedback]", err);
    return NextResponse.json({ error: "操作失败，请稍后重试" }, { status: 500 });
  }
}
