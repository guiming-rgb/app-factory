// ============================================================
// POST /api/billing/webhook — Stripe Webhook 处理器
//
// 处理工作空间级别订阅的 Stripe 事件：
//   - checkout.session.completed   → 激活订阅
//   - invoice.paid                 → 更新账单周期
//   - invoice.payment_failed       → 标记逾期
//   - customer.subscription.deleted → 标记取消
//   - customer.subscription.updated → 同步状态变更
//
// 使用 Stripe 签名验证。调用 subscription-service 中的
// handleStripeWebhook() 函数处理业务逻辑。
//
// 注意：这是 workspace 级别的订阅 webhook，与
// app/api/stripe/webhook/route.ts 中 user 级别的 webhook 并存。
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { handleStripeWebhook } from "@/lib/billing/subscription-service";
import { createComponentLogger } from "@/lib/logger";

export const runtime = "nodejs";

const log = createComponentLogger("billing-webhook");

export async function POST(req: NextRequest) {
  const sig = req.headers.get("stripe-signature");

  if (!sig) {
    log.warn("[billing/webhook] Missing stripe-signature header");
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 },
    );
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!webhookSecret) {
    log.error("[billing/webhook] STRIPE_WEBHOOK_SECRET not configured");
    return NextResponse.json(
      { error: "Webhook not configured" },
      { status: 500 },
    );
  }

  let rawBody: string;

  try {
    rawBody = await req.text();
  } catch (err) {
    log.error({ error: err }, "[billing/webhook] Failed to read request body");
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  try {
    const result = await handleStripeWebhook(rawBody, sig);

    log.info(
      { eventType: result.eventType, deduplicated: false },
      "[billing/webhook] Event processed successfully",
    );

    return NextResponse.json({ received: true });
  } catch (error) {
    // 签名验证失败
    if (error instanceof Error && error.message.includes("signature")) {
      log.error({ error }, "[billing/webhook] Signature verification failed");
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 401 },
      );
    }

    // 其他处理错误
    log.error({ error }, "[billing/webhook] Processing error");
    return NextResponse.json(
      { error: "Webhook processing error" },
      { status: 500 },
    );
  }
}
