import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

/**
 * B-4: Webhook 触发代码生成
 * POST /api/webhook/codegen
 * Header: X-API-Key: <api_key>
 * Body: { projectId, targets: ["flutter","wechat","harmony"] }
 * 外部系统（CI/GitHub/API）通过此端点触发代码生成
 */
export async function POST(req: NextRequest) {
  try {
    const apiKey = req.headers.get("x-api-key")?.trim();
    if (!apiKey) return NextResponse.json({ error: "Missing X-API-Key" }, { status: 401 });

    // 验证 API Key
    const supabase = getSupabaseAdmin();
    const { data: keyData } = await supabase
      .from("api_keys")
      .select("user_id, scopes")
      .eq("key_hash", apiKey)
      .maybeSingle();

    if (!keyData) return NextResponse.json({ error: "Invalid API Key" }, { status: 401 });

    const body = await req.json();
    const projectId = body.projectId as string;
    const targets = (Array.isArray(body.targets) ? body.targets : ["flutter", "wechat", "harmony"]) as string[];

    if (!projectId) return NextResponse.json({ error: "Missing projectId" }, { status: 400 });

    // 验证项目归属
    const { data: project } = await supabase
      .from("projects")
      .select("id, owner_id")
      .eq("id", projectId)
      .maybeSingle();

    const keyUserId = (keyData as Record<string, string>).user_id;
    const projectOwnerId = (project as Record<string, string> | null)?.owner_id;
    if (!project || projectOwnerId !== keyUserId) {
      return NextResponse.json({ error: "Project not found or access denied" }, { status: 403 });
    }

    // 触发并行生成
    const results = await Promise.allSettled(
      targets.map(async (target) => {
        if (target === "flutter") {
          const { runFlutterCodegenSync } = await import("@/lib/codegen/run-flutter-sync");
          return runFlutterCodegenSync({ projectId });
        } else if (target === "wechat") {
          const { runWechatCodegenSync } = await import("@/lib/codegen/run-wechat-sync");
          return runWechatCodegenSync({ projectId });
        } else {
          const { runHarmonyCodegenSync } = await import("@/lib/codegen/run-harmony-sync");
          return runHarmonyCodegenSync({ projectId });
        }
      })
    );

    const ok = results.every((r) => r.status === "fulfilled");
    return NextResponse.json({ ok, count: results.length });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
