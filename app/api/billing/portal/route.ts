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
import { requireWorkspaceMember } from "@/lib/auth/require-workspace-member";
import { validateBillingRedirectUrl } from "@/lib/billing/validate-billing-url";
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

    const auth = await requireWorkspaceMember(body.workspaceId);
    if (!auth.ok) return auth.response;

    const returnUrlResult = validateBillingRedirectUrl(body.returnUrl, "returnUrl");
    if (!returnUrlResult.ok) {
      return NextResponse.json({ error: returnUrlResult.error }, { status: 400 });
    }

    // ── 创建 Portal Session ──
    const portalUrl = await createPortalSession(
      body.workspaceId,
      returnUrlResult.url,
    );

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
