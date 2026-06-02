import { NextRequest, NextResponse } from "next/server";

import { fetchProjectWithAccess } from "@/lib/auth/require-project-access";
import { type CodegenTarget } from "@/lib/codegen/runs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALL_TARGETS: CodegenTarget[] = ["flutter", "wechat", "harmony"];

/**
 * POST: 并行生成三平台代码
 * P1: 代码生成并行化
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const projectId = params.id;

  try {
    const access = await fetchProjectWithAccess(projectId, "id");
    if (!access.ok) return access.response;

    const body = await req.json().catch(() => ({}));
    const targets = (Array.isArray(body.targets) ? body.targets : ALL_TARGETS) as CodegenTarget[];

    // 并行执行（各同步执行器内部自行创建 codegen_run）
    const results = await Promise.allSettled(
      targets.map(async (target) => {
        try {
          if (target === "flutter") {
            const { runFlutterCodegenSync } = await import("@/lib/codegen/run-flutter-sync");
            const result = await runFlutterCodegenSync({ projectId });
            return { target, ok: true, runId: result.id };
          } else if (target === "wechat") {
            const { runWechatCodegenSync } = await import("@/lib/codegen/run-wechat-sync");
            const result = await runWechatCodegenSync({ projectId });
            return { target, ok: true, runId: result.id };
          } else {
            const { runHarmonyCodegenSync } = await import("@/lib/codegen/run-harmony-sync");
            const result = await runHarmonyCodegenSync({ projectId });
            return { target, ok: true, runId: result.id };
          }
        } catch (err: unknown) {
          return { target, ok: false, error: err instanceof Error ? err.message : "生成失败" };
        }
      })
    );

    const ok = results.every((r) => r.status === "fulfilled" && r.value.ok);
    const errors = results
      .filter((r) => r.status === "rejected" || !r.value.ok)
      .map((r) => r.status === "rejected" ? { target: "unknown", error: String(r.reason) } : { target: r.value.target, error: r.value.error ?? "unknown" });

    return NextResponse.json({ ok, errors: errors.length ? errors : undefined });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "并行生成失败" }, { status: 500 });
  }
}
