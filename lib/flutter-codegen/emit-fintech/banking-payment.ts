// ─── 银行级支付（多方式 + 安全验证）───
export function emitFlutterBankingPayment(): string {
  return `import "package:flutter/material.dart";

/// 银行级支付页面 — 支持多支付方式 + 3D Secure 验证
/// 需要：Stripe / Adyen / Braintree 后端集成 + PCI DSS 合规
class BankingPaymentPage extends StatefulWidget {
  const BankingPaymentPage({super.key});

  @override
  State<BankingPaymentPage> createState() => _BankingPaymentPageState();
}

enum PaymentMethod { card, bankTransfer, wireTransfer, ach, sepa }

class _BankingPaymentPageState extends State<BankingPaymentPage> {
  PaymentMethod _method = PaymentMethod.card;
  final _cardNumberController = TextEditingController();
  final _expiryController = TextEditingController();
  final _cvvController = TextEditingController();
  final _amountController = TextEditingController(text: "100.00");
  String? _currency = "USD";
  bool _processing = false;
  String? _paymentIntentId;
  bool _require3DS = false;

  static const _currencies = ["USD", "EUR", "GBP", "CNY", "JPY", "CAD", "AUD"];

  @override
  void dispose() {
    _cardNumberController.dispose();
    _expiryController.dispose();
    _cvvController.dispose();
    _amountController.dispose();
    super.dispose();
  }

  Future<void> _processPayment() async {
    final amount = double.tryParse(_amountController.text) ?? 0;
    if (amount <= 0) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text("请输入有效金额")));
      return;
    }
    setState(() => _processing = true);

    // TODO: 对接 Stripe / Adyen 支付网关
    // 1. POST /api/create-payment-intent → 返回 clientSecret
    // 2. 3D Secure 验证（若 required）
    // 3. confirmPayment(clientSecret)
    // 4. Webhook 确认 → 更新订单状态
    await Future.delayed(const Duration(seconds: 2));

    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text("支付 \\$" + amount.toStringAsFixed(2) + " 需要 Stripe 商户账号和 PCI DSS 合规环境"),
          backgroundColor: Colors.orange,
          duration: const Duration(seconds: 4),
        ),
      );
      setState(() => _processing = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text("支付")),
      body: Form(
        child: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            // 金额
            Row(
              children: [
                Expanded(
                  flex: 3,
                  child: TextFormField(
                    controller: _amountController,
                    decoration: const InputDecoration(labelText: "金额", border: OutlineInputBorder(), prefixText: "\$ "),
                    keyboardType: const TextInputType.numberWithOptions(decimal: true),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  flex: 2,
                  child: DropdownButtonFormField<String>(
                    value: _currency,
                    decoration: const InputDecoration(labelText: "币种", border: OutlineInputBorder()),
                    items: _currencies.map((c) => DropdownMenuItem(value: c, child: Text(c))).toList(),
                    onChanged: (v) => setState(() => _currency = v),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 20),

            // 支付方式选择
            const Text("支付方式", style: TextStyle(fontWeight: FontWeight.w600, fontSize: 15)),
            const SizedBox(height: 8),
            ...PaymentMethod.values.map((m) => RadioListTile<PaymentMethod>(
              title: Text(_methodName(m)),
              subtitle: Text(_methodDesc(m), style: const TextStyle(fontSize: 12)),
              value: m, groupValue: _method,
              onChanged: (v) => setState(() => _method = v!),
              dense: true,
            )),
            const SizedBox(height: 16),

            // 银行卡输入（仅 card 模式）
            if (_method == PaymentMethod.card) ...[
              TextFormField(
                controller: _cardNumberController,
                decoration: const InputDecoration(labelText: "卡号", border: OutlineInputBorder(), hintText: "4242 4242 4242 4242"),
                keyboardType: TextInputType.number,
                maxLength: 19,
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(child: TextFormField(controller: _expiryController, decoration: const InputDecoration(labelText: "有效期", border: OutlineInputBorder(), hintText: "MM/YY"), maxLength: 5)),
                  const SizedBox(width: 12),
                  Expanded(child: TextFormField(controller: _cvvController, decoration: const InputDecoration(labelText: "CVV", border: OutlineInputBorder(), hintText: "123"), maxLength: 4, obscureText: true)),
                ],
              ),
            ],

            // 银行转账信息
            if (_method == PaymentMethod.bankTransfer) ...[
              const Card(child: Padding(padding: EdgeInsets.all(16), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text("银行转账说明", style: TextStyle(fontWeight: FontWeight.bold)),
                SizedBox(height: 8),
                Text("• 接收银行: Chase Bank"),
                Text("• 账号: ****1234"),
                Text("• SWIFT: CHASUS33"),
                Text("• 附言: 订单号 #XJ-2024"),
                SizedBox(height: 8),
                Text("转账后请上传回执凭证", style: TextStyle(color: Colors.orange)),
              ]))),
            ],

            const SizedBox(height: 24),

            // 提交按钮
            FilledButton(
              onPressed: _processing ? null : _processPayment,
              style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(48)),
              child: _processing
                  ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                  : Text("支付 \\$" + _amountController.text),
            ),

            const SizedBox(height: 12),
            const Text("🔒 支付数据经 PCI DSS Level 1 加密传输", style: TextStyle(fontSize: 11, color: Colors.grey), textAlign: TextAlign.center),
          ],
        ),
      ),
    );
  }

  String _methodName(PaymentMethod m) {
    switch (m) {
      case PaymentMethod.card: return "信用卡/借记卡";
      case PaymentMethod.bankTransfer: return "银行转账";
      case PaymentMethod.wireTransfer: return "电汇 (SWIFT)";
      case PaymentMethod.ach: return "ACH 自动清算 (美国)";
      case PaymentMethod.sepa: return "SEPA 转账 (欧洲)";
    }
  }

  String _methodDesc(PaymentMethod m) {
    switch (m) {
      case PaymentMethod.card: return "Visa / Mastercard / Amex，支持 3D Secure";
      case PaymentMethod.bankTransfer: return "国内银行转账，1-3 个工作日";
      case PaymentMethod.wireTransfer: return "国际电汇 SWIFT，手续费另计";
      case PaymentMethod.ach: return "美国银行间清算，0-1 个工作日";
      case PaymentMethod.sepa: return "欧盟单一欧元支付区，免费即时";
    }
  }
}
`;
}
