/**
 * Q2-M2: 支付状态机完整测试
 *
 * 覆盖：
 * - 所有合法状态转换
 * - 非法状态转换拒绝
 * - 终态不可转换
 * - 超时检测
 * - Stripe Webhook 解析
 * - 微信支付 XML 解析
 * - 金额格式化
 */

import { describe, it, expect } from "vitest";
import {
  canTransition,
  transition,
  isTerminal,
  checkExpiry,
  parseStripeEvent,
  parseWechatPayNotify,
  formatAmount,
  type PaymentOrder,
  type PaymentStatus,
  type PaymentMethod,
} from "@/lib/payment/payment-state-machine";

// ── Helpers ──────────────────────────────────────────────

function makeOrder(overrides: Partial<PaymentOrder> = {}): PaymentOrder {
  return {
    id: "order-1",
    userId: "user-1",
    amount: 9900, // ¥99.00
    currency: "cny",
    method: "stripe" as PaymentMethod,
    status: "pending" as PaymentStatus,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

// ── 合法状态转换测试 ─────────────────────────────────────

describe("支付状态机 — 合法转换", () => {
  const validTransitions: Array<{ from: PaymentStatus; to: PaymentStatus }> = [
    { from: "pending", to: "paid" },
    { from: "pending", to: "failed" },
    { from: "pending", to: "cancelled" },
    { from: "pending", to: "expired" },
    { from: "paid", to: "refund_pending" },
    { from: "paid", to: "refunded" },
    { from: "refund_pending", to: "refunded" },
    { from: "refund_pending", to: "paid" }, // 退款失败回退
  ];

  for (const { from, to } of validTransitions) {
    it(`${from} → ${to} 应允许`, () => {
      expect(canTransition(from, to)).toBe(true);
    });
  }

  for (const { from, to } of validTransitions) {
    it(`transition() ${from} → ${to} 应返回 ok`, () => {
      const order = makeOrder({ status: from });
      const result = transition(order, to);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.order.status).toBe(to);
        // paid 应设置 paidAt
        if (to === "paid") {
          expect(result.order.paidAt).toBeInstanceOf(Date);
        }
        // refunded 应设置 refundedAt
        if (to === "refunded") {
          expect(result.order.refundedAt).toBeInstanceOf(Date);
        }
      }
    });
  }
});

// ── 非法状态转换测试 ─────────────────────────────────────

describe("支付状态机 — 非法转换拒绝", () => {
  const invalidTransitions: Array<{ from: PaymentStatus; to: PaymentStatus }> = [
    { from: "paid", to: "pending" },
    { from: "paid", to: "failed" },
    { from: "paid", to: "cancelled" },
    { from: "paid", to: "expired" },
    { from: "failed", to: "paid" },
    { from: "failed", to: "pending" },
    { from: "cancelled", to: "paid" },
    { from: "cancelled", to: "pending" },
    { from: "expired", to: "paid" },
    { from: "expired", to: "pending" },
    { from: "refunded", to: "paid" },
    { from: "refunded", to: "pending" },
  ];

  for (const { from, to } of invalidTransitions) {
    it(`${from} → ${to} 应拒绝`, () => {
      expect(canTransition(from, to)).toBe(false);
    });
  }

  for (const { from, to } of invalidTransitions) {
    it(`transition() ${from} → ${to} 应返回错误`, () => {
      const order = makeOrder({ status: from });
      const result = transition(order, to);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain("非法状态转换");
        expect(result.error).toContain(from);
        expect(result.error).toContain(to);
      }
    });
  }
});

// ── 终态测试 ─────────────────────────────────────────────

describe("支付状态机 — 终态不可转换", () => {
  const terminalStatuses: PaymentStatus[] = ["failed", "cancelled", "expired", "refunded"];

  for (const status of terminalStatuses) {
    it(`${status} 应被识别为终态`, () => {
      expect(isTerminal(status)).toBe(true);
    });
  }

  const nonTerminalStatuses: PaymentStatus[] = ["pending", "paid", "refund_pending"];
  for (const status of nonTerminalStatuses) {
    it(`${status} 不应被识别为终态`, () => {
      expect(isTerminal(status)).toBe(false);
    });
  }

  for (const status of terminalStatuses) {
    it(`${status} → 任何状态应被 canTransition 拒绝`, () => {
      const allStatuses: PaymentStatus[] = ["pending", "paid", "failed", "cancelled", "expired", "refund_pending", "refunded"];
      for (const target of allStatuses) {
        if (target === status) continue; // 相同状态也是拒绝的
        expect(canTransition(status, target)).toBe(false);
      }
    });
  }
});

// ── 超时检测测试 ─────────────────────────────────────────

describe("支付状态机 — 超时检测", () => {
  it("pending 状态超过 timeoutMinutes 应返回 expired", () => {
    const oldDate = new Date(Date.now() - 40 * 60 * 1000); // 40 分钟前
    const order = makeOrder({ status: "pending", createdAt: oldDate });
    const result = checkExpiry(order, 30);
    expect(result).not.toBeNull();
    expect(result!.status).toBe("expired");
  });

  it("pending 状态未超时应返回 null", () => {
    const recentDate = new Date(Date.now() - 5 * 60 * 1000); // 5 分钟前
    const order = makeOrder({ status: "pending", createdAt: recentDate });
    const result = checkExpiry(order, 30);
    expect(result).toBeNull();
  });

  it("非 pending 状态不触发超时", () => {
    const oldDate = new Date(Date.now() - 40 * 60 * 1000);
    const order = makeOrder({ status: "paid", createdAt: oldDate });
    const result = checkExpiry(order, 30);
    expect(result).toBeNull();
  });

  it("默认超时时长为 30 分钟", () => {
    const justOver = new Date(Date.now() - 31 * 60 * 1000);
    const justUnder = new Date(Date.now() - 29 * 60 * 1000);
    expect(checkExpiry(makeOrder({ status: "pending", createdAt: justOver }))).not.toBeNull();
    expect(checkExpiry(makeOrder({ status: "pending", createdAt: justUnder }))).toBeNull();
  });
});

// ── Stripe Event 解析测试 ────────────────────────────────

describe("支付状态机 — Stripe Event 解析", () => {
  it("payment_intent.succeeded 应解析为 paid", () => {
    const result = parseStripeEvent({
      type: "payment_intent.succeeded",
      data: {
        object: {
          id: "pi_123",
          amount_received: 9900,
          currency: "cny",
        },
      },
    });
    expect(result).not.toBeNull();
    expect(result!.paymentIntentId).toBe("pi_123");
    expect(result!.status).toBe("paid");
    expect(result!.amount).toBe(9900);
    expect(result!.currency).toBe("cny");
  });

  it("payment_intent.payment_failed 应解析为 failed", () => {
    const result = parseStripeEvent({
      type: "payment_intent.payment_failed",
      data: {
        object: {
          id: "pi_fail_456",
          last_payment_error: { message: "card_declined" },
        },
      },
    });
    expect(result).not.toBeNull();
    expect(result!.paymentIntentId).toBe("pi_fail_456");
    expect(result!.status).toBe("failed");
  });

  it("charge.refunded 应解析为 refunded", () => {
    const result = parseStripeEvent({
      type: "charge.refunded",
      data: {
        object: {
          id: "ch_789",
          payment_intent: "pi_123",
          amount_refunded: 9900,
        },
      },
    });
    expect(result).not.toBeNull();
    expect(result!.paymentIntentId).toBe("pi_123");
    expect(result!.status).toBe("refunded");
    expect(result!.amount).toBe(9900);
  });

  it("未知 event type 应返回 null", () => {
    const result = parseStripeEvent({
      type: "unknown.event_type",
      data: { object: {} },
    });
    expect(result).toBeNull();
  });

  it("charge.refunded 缺乏 payment_intent 时不应崩溃", () => {
    const result = parseStripeEvent({
      type: "charge.refunded",
      data: {
        object: {
          id: "ch_999",
          amount_refunded: 5000,
        },
      },
    });
    expect(result).not.toBeNull();
    expect(result!.paymentIntentId).toBe("");
  });
});

// ── 微信支付 XML 解析测试 ───────────────────────────────

describe("支付状态机 — 微信支付 XML 解析", () => {
  it("成功回调应解析为 paid", () => {
    const xml = `<xml>
  <return_code><![CDATA[SUCCESS]]></return_code>
  <result_code><![CDATA[SUCCESS]]></result_code>
  <prepay_id><![CDATA[wx1234567890]]></prepay_id>
  <transaction_id><![CDATA[4200001234202212345678901234]]></transaction_id>
  <total_fee><![CDATA[9900]]></total_fee>
</xml>`;
    const result = parseWechatPayNotify(xml);
    expect(result).not.toBeNull();
    expect(result!.status).toBe("paid");
    expect(result!.prepayId).toBe("wx1234567890");
    expect(result!.transactionId).toBe("4200001234202212345678901234");
    expect(result!.amount).toBe(9900);
  });

  it("失败回调应解析为 failed", () => {
    const xml = `<xml>
  <return_code><![CDATA[SUCCESS]]></return_code>
  <result_code><![CDATA[FAIL]]></result_code>
  <prepay_id><![CDATA[wx123]]></prepay_id>
  <transaction_id><![CDATA[4200001234]]></transaction_id>
  <err_code><![CDATA[PAY_FAIL]]></err_code>
</xml>`;
    const result = parseWechatPayNotify(xml);
    expect(result).not.toBeNull();
    expect(result!.status).toBe("failed");
  });

  it("return_code 非 SUCCESS 应返回 null", () => {
    const xml = `<xml>
  <return_code><![CDATA[FAIL]]></return_code>
  <return_msg><![CDATA[签名失败]]></return_msg>
</xml>`;
    const result = parseWechatPayNotify(xml);
    expect(result).toBeNull();
  });

  it("空 XML 应返回 null（不崩溃）", () => {
    const result = parseWechatPayNotify("");
    expect(result).toBeNull();
  });

  it("缺失 total_fee 时 amount 应为 undefined", () => {
    const xml = `<xml>
  <return_code><![CDATA[SUCCESS]]></return_code>
  <result_code><![CDATA[SUCCESS]]></result_code>
  <prepay_id><![CDATA[wx123]]></prepay_id>
  <transaction_id><![CDATA[4200001234]]></transaction_id>
</xml>`;
    const result = parseWechatPayNotify(xml);
    expect(result).not.toBeNull();
    expect(result!.amount).toBeUndefined();
  });
});

// ── 金额格式化测试 ───────────────────────────────────────

describe("支付状态机 — 金额格式化", () => {
  it("CNY 金额应格式化为人民币符号", () => {
    expect(formatAmount(9900, "cny")).toBe("¥ 99.00");
    expect(formatAmount(100, "cny")).toBe("¥ 1.00");
    expect(formatAmount(0, "cny")).toBe("¥ 0.00");
  });

  it("USD 金额应格式化为美元符号", () => {
    expect(formatAmount(1999, "usd")).toBe("$ 19.99");
  });

  it("EUR 金额应格式化为欧元符号", () => {
    expect(formatAmount(5000, "eur")).toBe("€ 50.00");
  });

  it("未知货币应显示货币代码", () => {
    expect(formatAmount(1000, "jpy")).toBe("jpy 10.00");
  });

  it("金额始终显示两位小数", () => {
    expect(formatAmount(1, "cny")).toBe("¥ 0.01");
    expect(formatAmount(1234, "cny")).toBe("¥ 12.34");
    expect(formatAmount(123456, "cny")).toBe("¥ 1234.56");
  });
});
