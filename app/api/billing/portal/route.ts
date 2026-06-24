// ============================================================
// POST /api/billing/portal — 创建 Stripe Customer Portal Session
//
// 请求体:
//   { workspaceId: string, returnUrl: string }
//
// 返回:
//   { portalUrl: string }
//
// Customer Portal 允许用户自行管理：
//   - 更新支付方式
//   - 查看账单历史 / 发票
//   - 取消订阅
//   - 更新联系方式
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { createPortalSession } from "@/lib/billing/subscription-service";
import { createComponentLogger } from "@/lib/logger";

export const runtime = "nodejs";

const log = createComponentLogger("billing-portal");

interface PortalRequestBody {
  workspaceId: string;
  returnUrl: string;
}

export async function POST(req: NextRequest) {
  try {
    const body: PortalRequestBody = await req.json();

    // ── 参数校验 ──
    if (!body.workspaceId || typeof body.workspaceId !== "string") {
      return NextResponse.json(
        { error: "workspaceId is required" },
        { status: 400 },
      );
    }

    if (!body.returnUrl || typeof body.returnUrl !== "string") {
      return NextResponse.json(
        { error: "returnUrl is required" },
        { status: 400 },
      );
    }

    // 验证 returnUrl 是安全的（仅允许相对路径或本站 URL）
    try {
      const parsed = new URL(body.returnUrl, process.env.NEXT_PUBLIC_APP_URL);
      const appUrl = new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000");
      if (parsed.origin !== appUrl.origin) {
        return NextResponse.json(
          { error: "returnUrl must be on the same origin as the application" },
          { status: 400 },
        );
      }
    } catch {
      // 如果 URL 解析失败，可能是一个相对路径，可以接受
    }

    // ── 创建 Portal Session ──
    const portalUrl = await createPortalSession(body.workspaceId, body.returnUrl);

    log.info(
      { workspaceId: body.workspaceId },
      "[billing] Customer portal session created",
    );

    return NextResponse.json({ portalUrl });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    log.error({ error: message }, "[billing/portal] Failed to create portal session");

    if (message.includes("not configured")) {
      return NextResponse.json(
        { error: "Stripe billing portal is not configured" },
        { status: 501 },
      );
    }

    if (message.includes("No Stripe customer")) {
      return NextResponse.json(
        { error: "No billing profile exists for this workspace. Subscribe first." },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: "Failed to create portal session" },
      { status: 500 },
    );
  }
}
