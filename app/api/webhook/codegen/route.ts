import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { createHash } from "crypto";

export const runtime = "nodejs";

/**
 * ✅ 对 API Key 进行 SHA-256 哈希
 * key_hash 列存储哈希值，永不存储明文
 */
function hashApiKey(rawKey: string): string {
  return createHash("sha256").update(rawKey).digest("hex");
}

const VALID_TARGETS = ["flutter", "wechat", "harmony"] as const;
type CodegenTarget = (typeof VALID_TARGETS)[number];

function isValidTarget(t: string): t is CodegenTarget {
  return (VALID_TARGETS as readonly string[]).includes(t);
}

/**
 * B-4: Webhook 触发代码生成
 * POST /api/webhook/codegen
 * Header: X-API-Key: <api_key>
 * Body: { projectId, targets: ["flutter","wechat","harmony"] }
 * 外部系统（CI/GitHub/API）通过此端点触发代码生成
 */
export async function POST(req: NextRequest) {
  try {
    const rawApiKey = req.headers.get("x-api-key")?.trim();
    if (!rawApiKey) {
      return NextResponse.json({ error: "Missing X-API-Key" }, { status: 401 });
    }

    // ✅ 哈希后再比较 — 不再明文比较
    const keyHash = hashApiKey(rawApiKey);
    const supabase = getSupabaseAdmin();

    const { data: keyData } = await supabase
      .from("api_keys")
      .select("user_id, scopes")
      .eq("key_hash", keyHash)
      .maybeSingle();

    if (!keyData) {
      return NextResponse.json({ error: "Invalid API Key" }, { status: 401 });
    }

    // 更新最后使用时间（fire-and-forget）
    void supabase
      .from("api_keys")
      .update({ last_used_at: new Date().toISOString() })
      .eq("key_hash", keyHash)
      .then(undefined, () => {});

    let body: Record<string, unknown>;
    try {
      body = (await req.json()) as Record<string, unknown>;
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const projectId = body.projectId as string | undefined;
    const rawTargets = Array.isArray(body.targets) ? body.targets : [];

    if (!projectId) {
      return NextResponse.json({ error: "Missing projectId" }, { status: 400 });
    }

    // ✅ 过滤并校验 target — 不再有未知 target 的 fallback
    const targets = (rawTargets as string[]).filter(isValidTarget);
    if (targets.length === 0) {
      return NextResponse.json(
        { error: "No valid targets. Supported: flutter, wechat, harmony" },
        { status: 400 }
      );
    }

    // 验证项目归属
    const { data: project } = await supabase
      .from("projects")
      .select("id, owner_id")
      .eq("id", projectId)
      .maybeSingle();

    const keyUserId = (keyData as Record<string, string>).user_id;
    const projectOwnerId = (project as Record<string, string> | null)
      ?.owner_id;

    if (!project || projectOwnerId !== keyUserId) {
      return NextResponse.json(
        { error: "Project not found or access denied" },
        { status: 403 }
      );
    }

    // 并行执行各 target 的代码生成
    const results = await Promise.allSettled(
      targets.map(async (target) => {
        switch (target) {
          case "flutter": {
            const { runFlutterCodegenSync } = await import(
              "@/lib/codegen/run-flutter-sync"
            );
            return await runFlutterCodegenSync({ projectId });
          }
          case "wechat": {
            const { runWechatCodegenSync } = await import(
              "@/lib/codegen/run-wechat-sync"
            );
            return await runWechatCodegenSync({ projectId });
          }
          case "harmony": {
            const { runHarmonyCodegenSync } = await import(
              "@/lib/codegen/run-harmony-sync"
            );
            return await runHarmonyCodegenSync({ projectId });
          }
          // unreachable due to isValidTarget filter
        }
      })
    );

    // ✅ 返回每个 target 的详细结果，不再丢失失败信息
    const succeeded: string[] = [];
    const failed: { target: string; error: string }[] = [];

    targets.forEach((target, i) => {
      const result = results[i]!;
      if (result.status === "fulfilled") {
        succeeded.push(target);
      } else {
        failed.push({
          target,
          error:
            result.reason instanceof Error
              ? result.reason.message
              : "Unknown error",
        });
      }
    });

    return NextResponse.json({
      ok: failed.length === 0,
      succeeded,
      failed,
      total: targets.length,
    });
  } catch (err) {
    console.error("[webhook/codegen]", err);
    // 不泄露内部错误详情给客户端
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
