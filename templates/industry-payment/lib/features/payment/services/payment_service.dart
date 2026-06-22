import "package:flutter/material.dart";
import "package:supabase_flutter/supabase_flutter.dart";

/// 支付服务 — 对标 Stripe Checkout / 微信支付 JSAPI
/// 流程：创建 PaymentIntent → 确认 → Webhook 更新订单状态

class PaymentService {
  final SupabaseClient _c;
  PaymentService(this._c);

  // ─── Stripe: 服务端创建 PaymentIntent，客户端确认 ───

  /// 创建支付意图（调用你的后端 /api/stripe/create-payment-intent）
  Future<Map<String, dynamic>> createStripePayment({
    required double amount,
    required String currency,
    String? description,
  }) async {
    final response = await _c.functions.invoke("stripe-create-payment-intent", body: {
      "amount": (amount * 100).toInt(), // Stripe 用「分」
      "currency": currency,
      "description": description,
    });
    return response.data as Map<String, dynamic>;
  }

  /// Stripe Webhook 回调 — 由你的后端处理
  /// Supabase Edge Function 监听 stripe.webhook 事件 → 更新 orders.status
  /// 此处为客户端轮询订单状态

  Future<String?> pollOrderStatus(String orderId, {int maxAttempts = 30}) async {
    for (var i = 0; i < maxAttempts; i++) {
      await Future.delayed(const Duration(seconds: 2));
      final r = await _c.from("orders").select("status").eq("id", orderId).maybeSingle();
      final status = (r as Map?)?['status'] as String?;
      if (status == "paid" || status == "failed") return status;
    }
    return null;
  }

  // ─── 通用支付门面 ──────────────────────────────

  Future<PaymentResult> pay({
    required double amount,
    required String method, // stripe / wechat / alipay
    String currency = "cny",
    String? orderId,
    String? description,
  }) async {
    switch (method) {
      case "stripe":
        final intent = await createStripePayment(amount: amount, currency: currency, description: description);
        final clientSecret = intent["client_secret"] as String?;
        if (clientSecret == null) return PaymentResult.failure("Stripe 创建支付意图失败");
        // 客户端用 flutter_stripe 的 Stripe.instance.confirmPayment(clientSecret) 确认
        // 此处在真实 App 中会拉起 Stripe Sheet
        final status = await pollOrderStatus(orderId ?? "");
        return status == "paid" ? PaymentResult.success() : PaymentResult.failure("支付未完成");

      case "wechat":
        // 微信支付 JSAPI：需后端预下单 → 返回 prepay_id → 客户端 wx.requestPayment
        final prepay = await _c.functions.invoke("wechat-create-order", body: {
          "amount": (amount * 100).toInt(), "order_id": orderId, "description": description,
        });
        final prepayData = prepay.data as Map<String, dynamic>?;
        if (prepayData == null) return PaymentResult.failure("微信预下单失败");
        // 客户端拉起微信支付（需 flutter_wechat_pay 插件）
        return PaymentResult.pending(prepayData);

      default:
        return PaymentResult.failure("不支持的支付方式: $method");
    }
  }

  // ─── 订单查询 ──────────────────────────────────

  Future<List<Map<String, dynamic>>> getPaymentHistory() async =>
      ((await _c.from("orders").select("*").eq("user_id", _c.auth.currentUser!.id).order("created_at", ascending: false)) as List).cast<Map<String, dynamic>>();
}

class PaymentResult {
  final bool success;
  final bool pending;
  final String? message;
  final Map<String, dynamic>? prepayData;

  PaymentResult._({this.success = false, this.pending = false, this.message, this.prepayData});
  factory PaymentResult.success() => PaymentResult._(success: true);
  factory PaymentResult.failure(String msg) => PaymentResult._(message: msg);
  factory PaymentResult.pending(Map<String, dynamic> data) => PaymentResult._(pending: true, prepayData: data);
}
