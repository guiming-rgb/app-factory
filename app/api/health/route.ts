import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 轻量健康检查 — 供外部 cron 保活，避免 Vercel Hobby 冷启动 */
export async function GET() {
  return NextResponse.json({ ok: true, ts: Date.now() });
}
