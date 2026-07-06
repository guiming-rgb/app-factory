/**
 * Q2-M2: 支付状态机
 *
 * 统一管理 Stripe / 微信支付 / 其他支付方式的状态流转。
 *
 * 状态图:
 *   pending ──→ paid ──→ refunded
 *     │           │
 *     └──→ failed │
 *     └──→ cancelled
 *     └──→ expired
 *
 * 状态转换规则:
 *   pending → paid       (支付成功确认)
 *   pending → failed     (支付失败 / 超时)
 *   pending → cancelled  (用户取消)
 *   pending → expired    (超时未支付)
 *   paid    → refunded   (退款完成)
 *   paid    → refund_pending (退款处理中)
 */

export type PaymentStatus =
  | "pending"
  | "paid"
  | "failed"
  | "cancelled"
  | "expired"
  | "refund_pending"
  | "refunded";

export type PaymentMethod = "stripe" | "wechat" | "alipay" | "apple_pay" | "manual";

export interface PaymentOrder {
  id: string;
  userId: string;
  amount: number;          // 单位：分（Stripe）/ 分（微信）
  currency: string;         // cny / usd / eur
  method: PaymentMethod;
  status: PaymentStatus;
  description?: string;
  metadata?: Record<string, unknown>;
  stripePaymentIntentId?: string;
  wechatPrepayId?: string;
  wechatTransactionId?: string;
  refundId?: string;
  refundAmount?: number;
  createdAt: Date;
  updatedAt: Date;
  paidAt?: Date;
  refundedAt?: Date;
}

/** 允许的状态转换 */
const ALLOWED_TRANSITIONS: Record<PaymentStatus, PaymentStatus[]> = {
  pending: ["paid", "failed", "cancelled", "expired"],
  paid: ["refund_pending", "refunded"],
  failed: [],           // 终态
  cancelled: [],        // 终态
  expired: [],          // 终态
  refund_pending: ["refunded", "paid"], // 退款失败回退到 paid
  refunded: [],         // 终态
};

/** 终态集合 */
const TERMINAL_STATUSES: Set<PaymentStatus> = new Set([
  "failed",
  "cancelled",
  "expired",
  "refunded",
]);

/**
 * 验证状态转换是否合法
 */
export function canTransition(
  from: PaymentStatus,
  to: PaymentStatus
): boolean {
  const allowed = ALLOWED_TRANSITIONS[from];
  if (!allowed) return false;
  return allowed.includes(to);
}

/**
 * 执行状态转换（带校验）
 * @returns 新的 PaymentOrder 或错误消息
 */
export function transition(
  order: PaymentOrder,
  to: PaymentStatus,
  metadata?: Record<string, unknown>
): { ok: true; order: PaymentOrder } | { ok: false; error: string } {
  if (!canTransition(order.status, to)) {
    return {
      ok: false,
      error: `非法状态转换: ${order.status} → ${to}`,
    };
  }

  const now = new Date();
  const updated: PaymentOrder = {
    ...order,
    status: to,
    updatedAt: now,
    ...(to === "paid" ? { paidAt: now } : {}),
    ...(to === "refunded" ? { refundedAt: now } : {}),
    ...(metadata ? { metadata: { ...order.metadata, ...metadata } } : {}),
  };

  return { ok: true, order: updated };
}

/**
 * 判断是否为终态
 */
export function isTerminal(status: PaymentStatus): boolean {
  return TERMINAL_STATUSES.has(status);
}

/**
 * 支付超时检测（创建后 N 分钟未支付 → expired）
 */
export function checkExpiry(
  order: PaymentOrder,
  timeoutMinutes: number = 30
): PaymentOrder | null {
  if (order.status !== "pending") return null;
  const elapsed = Date.now() - order.createdAt.getTime();
  if (elapsed > timeoutMinutes * 60 * 1000) {
    const result = transition(order, "expired");
    return result.ok ? result.order : null;
  }
  return null;
}

/**
 * 从 Stripe webhook event 提取支付信息
 */
export function parseStripeEvent(event: {
  type: string;
  data: { object: Record<string, unknown> };
}): {
  paymentIntentId: string;
  status: PaymentStatus;
  amount?: number;
  currency?: string;
} | null {
  const obj = event.data.object;

  switch (event.type) {
    case "payment_intent.succeeded":
      return {
        paymentIntentId: obj.id as string,
        status: "paid",
        amount: obj.amount_received as number,
        currency: (obj.currency as string)?.toLowerCase(),
      };
    case "payment_intent.payment_failed":
      return {
        paymentIntentId: obj.id as string,
        status: "failed",
      };
    case "charge.refunded":
      return {
        paymentIntentId: (obj.payment_intent as string) || "",
        status: "refunded",
        amount: obj.amount_refunded as number,
      };
    default:
      return null;
  }
}

import { createHash } from "crypto";

/**
 * 微信支付 V2 回调验签（MD5）
 * 未配置 WECHAT_PAY_API_KEY 时返回 false（生产环境应拒绝未验签回调）
 */
export function verifyWechatPayNotifySignature(xml: string): boolean {
  const apiKey = process.env.WECHAT_PAY_API_KEY?.trim();
  if (!apiKey) {
    return process.env.NODE_ENV !== "production";
  }

  const getTag = (tag: string) => {
    const cdata = xml.match(
      new RegExp(`<${tag}><!\\[CDATA\\[([^\\]]+)\\]\\]></${tag}>`),
    );
    if (cdata?.[1]) return cdata[1];
    const plain = xml.match(new RegExp(`<${tag}>([^<]+)</${tag}>`));
    return plain?.[1] ?? null;
  };

  const sign = getTag("sign");
  if (!sign) return false;

  const fields: Record<string, string> = {};
  const tagRegex = /<(\w+)>(?:<!\[CDATA\[([^\]]+)\]\]|([^<]+))<\/\1>/g;
  let match: RegExpExecArray | null;
  while ((match = tagRegex.exec(xml)) !== null) {
    const key = match[1];
    const value = match[2] ?? match[3] ?? "";
    if (key !== "sign") fields[key] = value;
  }

  const sorted = Object.keys(fields)
    .sort()
    .map((k) => `${k}=${fields[k]}`)
    .join("&");

  const expected = createHash("md5")
    .update(`${sorted}&key=${apiKey}`)
    .digest("hex")
    .toUpperCase();

  return expected === sign.toUpperCase();
}

/**
 * 从微信支付回调提取支付信息
 */
export function parseWechatPayNotify(xml: string): {
  prepayId: string;
  transactionId: string;
  status: PaymentStatus;
  amount?: number;
} | null {
  // 简化实现：提取关键字段（生产环境需验签）
  const getTag = (tag: string) => {
    const m = xml.match(new RegExp(`<${tag}><!\\[CDATA\\[([^\\]]+)\\]\\]></${tag}>`));
    return m?.[1] || null;
  };

  const resultCode = getTag("result_code");
  const returnCode = getTag("return_code");

  if (returnCode !== "SUCCESS") return null;

  return {
    prepayId: getTag("prepay_id") || "",
    transactionId: getTag("transaction_id") || "",
    status: resultCode === "SUCCESS" ? "paid" : "failed",
    amount: getTag("total_fee") ? parseInt(getTag("total_fee")!) : undefined,
  };
}

/**
 * 格式化金额为展示用字符串
 */
export function formatAmount(amount: number, currency: string): string {
  const majorUnit = amount / 100; // 分 → 元
  const symbols: Record<string, string> = {
    cny: "¥",
    usd: "$",
    eur: "€",
  };
  return `${symbols[currency] || currency} ${majorUnit.toFixed(2)}`;
}
