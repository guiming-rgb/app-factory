import { NextRequest, NextResponse } from "next/server";

import { enqueueCodegenJob } from "@/lib/codegen/enqueue";
import { getSupabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const projectId = params.id;

  try {
    const { data: project, error } = await getSupabaseAdmin()
      .from("projects")
      .select("id")
      .eq("id", projectId)
      .single();

    if (error || !project) {
      return NextResponse.json({ error: "项目不存在" }, { status: 404 });
    }

    const run = await enqueueCodegenJob({ projectId, target: "wechat" });

    return NextResponse.json({
      success: true,
      mode: "async",
      target: "wechat",
      runId: run.id,
      status: run.status,
      message: "微信小程序 codegen 已进入后台队列"
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "启动微信小程序 codegen 失败";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
