// ============================================================
// GET /api/billing/plans — 获取所有定价方案
//
// 公开端点，无需认证。
// 返回硬编码的定价方案列表（Free / Pro / Enterprise）。
// ============================================================

import { NextResponse } from "next/server";
import { getPricingPlans } from "@/lib/billing/subscription-service";

export const runtime = "nodejs";

export async function GET() {
  try {
    const plans = getPricingPlans();

    return NextResponse.json({
      plans,
      currency: "CNY",
      currencySymbol: "¥",
    });
  } catch (error) {
    console.error("[billing/plans] Error fetching plans:", error);
    return NextResponse.json(
      { error: "Failed to fetch pricing plans" },
      { status: 500 },
    );
  }
}
