import { NextRequest, NextResponse } from "next/server";
import { handleStripeWebhook } from "@/lib/billing/subscription-service";
import { createComponentLogger } from "@/lib/logger";

export const runtime = "nodejs";

const log = createComponentLogger("stripe-webhook");

/**
 * 工作空间级 Stripe 订阅 webhook（与 /api/billing/webhook 共用 handleStripeWebhook）。
 * 处理 checkout / invoice / subscription 全生命周期事件。
 */
export async function POST(req: NextRequest) {
  const sig = req.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!webhookSecret) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 400 });
  }

  let rawBody: string;
  try {
    rawBody = await req.text();
  } catch (err) {
    console.error("[stripe/webhook] Failed to read request body", err);
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  try {
    const result = await handleStripeWebhook(rawBody, sig);
    log.info({ eventType: result.eventType }, "[stripe/webhook] Event processed");
    return NextResponse.json({ received: true, eventType: result.eventType });
  } catch (err) {
    if (err instanceof Error && err.message.includes("signature")) {
      console.error("[stripe/webhook] Signature verification failed", err);
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
    console.error("[stripe/webhook] Processing error:", err);
    return NextResponse.json({ error: "Webhook processing error" }, { status: 500 });
  }
}
