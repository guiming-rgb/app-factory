import { NextRequest, NextResponse } from "next/server";

import { getGlobalUsageStats } from "@/lib/usage-dashboard";
import { requireAuth } from "@/lib/auth/require-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET: 全局用量仪表盘数据（需要登录）
 */
export async function GET(req: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const daysParam = req.nextUrl.searchParams.get("days");
    const days = Math.min(90, Math.max(7, Number(daysParam) || 30));

    const stats = await getGlobalUsageStats(days);

    if (!stats) {
      return NextResponse.json(
        { error: "获取用量统计失败" },
        { status: 500 }
      );
    }

    return NextResponse.json(stats, {
      headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "用量统计失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
