import { NextRequest, NextResponse } from "next/server";

import { getApiUser } from "@/lib/auth/api-user";
import { runFlutterCodegenSync } from "@/lib/codegen/run-flutter-sync";
import { enforceRateLimit } from "@/lib/auth/rate-limit";
import { guardProjectAccess } from "@/lib/auth/require-project-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const projectId = params.id;

  const denied = await guardProjectAccess(projectId);
  if (denied) {
    return denied;
  }

  try {
    const user = await getApiUser();
    const limited = await enforceRateLimit(req, "codegen", user?.id);
    if (limited) {
      return limited;
    }

    const run = await runFlutterCodegenSync({
      projectId,
      userId: user?.id
    });

    const gha = (
      run.metadata as { desktopGha?: { status?: string; message?: string } } | null
    )?.desktopGha;
    const message =
      gha?.status === "queued" || gha?.status === "running"
        ? "Flutter 源码 ZIP 已就绪；Mac/Win 可双击包由 GitHub Actions 构建中（页面自动刷新）"
        : gha?.status === "completed"
          ? "Flutter 与 Mac/Win 可双击包均已就绪"
          : gha?.status === "failed"
            ? (gha.message ??
              "Flutter 源码 ZIP 已就绪；桌面包构建失败，见 Actions 或日志")
            : "Flutter 源码 ZIP 已就绪";

    return NextResponse.json({
      success: true,
      mode: "sync",
      target: "flutter",
      runId: run.id,
      status: run.status,
      message
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "启动 Flutter codegen 失败";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
