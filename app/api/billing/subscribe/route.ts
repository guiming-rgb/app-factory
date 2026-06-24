// ============================================================
// POST /api/billing/subscribe — 创建 Stripe Checkout Session
//
// 请求体:
//   {
//     planId: string,       // "free" | "pro" | "enterprise"
//     workspaceId: string,
//     interval?: "monthly" | "yearly"  (默认 monthly)
//     successUrl?: string,
//     cancelUrl?: string
//   }
//
// 返回:
//   { checkoutUrl: string, subscriptionId: string }
//
// Free 方案返回空 checkoutUrl（无需付款）。
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { createSubscription } from "@/lib/billing/subscription-service";
import { createComponentLogger } from "@/lib/logger";

export const runtime = "nodejs";

const log = createComponentLogger("billing-api");

interface SubscribeRequestBody {
  planId: string;
  workspaceId: string;
  interval?: "monthly" | "yearly";
  successUrl?: string;
  cancelUrl?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body: SubscribeRequestBody = await req.json();

    // ── 参数校验 ──
    if (!body.workspaceId || typeof body.workspaceId !== "string") {
      return NextResponse.json(
        { error: "workspaceId is required" },
        { status: 400 },
      );
    }

    if (!body.planId || typeof body.planId !== "string") {
      return NextResponse.json(
        { error: "planId is required" },
        { status: 400 },
      );
    }

    const validPlans = ["free", "pro", "enterprise"];
    if (!validPlans.includes(body.planId)) {
      return NextResponse.json(
        { error: `Invalid planId. Must be one of: ${validPlans.join(", ")}` },
        { status: 400 },
      );
    }

    const interval = body.interval ?? "monthly";
    if (!["monthly", "yearly"].includes(interval)) {
      return NextResponse.json(
        { error: "interval must be 'monthly' or 'yearly'" },
        { status: 400 },
      );
    }

    // ── 创建订阅 ──
    const result = await createSubscription(
      body.workspaceId,
      body.planId,
      interval,
      {
        successUrl: body.successUrl,
        cancelUrl: body.cancelUrl,
      },
    );

    log.info(
      {
        workspaceId: body.workspaceId,
        planId: body.planId,
        interval,
        hasCheckoutUrl: !!result.checkoutUrl,
      },
      "[billing] Subscription created",
    );

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    log.error({ error: message }, "[billing] Failed to create subscription");

    // 区分预期错误和意外错误
    if (
      message.includes("not found") ||
      message.includes("Invalid plan") ||
      message.includes("requires createSubscription")
    ) {
      return NextResponse.json({ error: message }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Failed to create subscription" },
      { status: 500 },
    );
  }
}
