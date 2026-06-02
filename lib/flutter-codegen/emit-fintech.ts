/**
 * 银行级支付 + 保险 模板
 * 依赖：Stripe Connect / Plaid / 保险精算 API
 */

function esc(str: string): string {
  return str.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\$/g, "\\$");
}

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

// ─── 保险产品管理 + 理赔 ───
export function emitFlutterInsuranceClaims(): string {
  return `import "package:flutter/material.dart";

/// 保险产品浏览 + 理赔申请
class InsurancePage extends StatefulWidget {
  const InsurancePage({super.key});

  @override
  State<InsurancePage> createState() => _InsurancePageState();
}

class _Policy {
  final String id;
  final String type;
  final String name;
  final String coverage;
  final String premium;
  final String status;
  final IconData icon;
  const _Policy({required this.id, required this.type, required this.name, required this.coverage, required this.premium, required this.status, required this.icon});
}

class _Claim {
  final String id;
  final String policyName;
  final String amount;
  final String status;
  final DateTime date;
  final String description;
  const _Claim({required this.id, required this.policyName, required this.amount, required this.status, required this.date, required this.description});
}

class _InsurancePageState extends State<InsurancePage> {
  int _tabIndex = 0;

  final _policies = [
    const _Policy(id: "p1", type: "健康险", name: "百万医疗险", coverage: "¥2,000,000", premium: "¥368/年", status: "生效中", icon: Icons.health_and_safety),
    const _Policy(id: "p2", type: "车险", name: "机动车综合险", coverage: "¥500,000", premium: "¥3,200/年", status: "生效中", icon: Icons.directions_car),
    const _Policy(id: "p3", type: "寿险", name: "定期寿险", coverage: "¥1,000,000", premium: "¥1,800/年", status: "生效中", icon: Icons.favorite),
    const _Policy(id: "p4", type: "意外险", name: "综合意外险", coverage: "¥300,000", premium: "¥198/年", status: "待续费", icon: Icons.shield),
  ];

  final _claims = [
    const _Claim(id: "c1", policyName: "百万医疗险", amount: "¥8,500", status: "已赔付", date: null, description: "住院治疗 — 阑尾炎手术"),
    const _Claim(id: "c2", policyName: "机动车综合险", amount: "¥12,000", status: "审核中", date: null, description: "追尾事故 — 后保险杠更换"),
  ].map((c) => _Claim(id: c.id, policyName: c.policyName, amount: c.amount, status: c.status, date: DateTime.now().subtract(Duration(days: 30)), description: c.description)).toList();

  double _deductible = 500;
  bool _agreeTerms = false;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text("保险")),
      body: Column(
        children: [
          // Tab 切换
          Row(
            children: [
              _TabButton("我的保单", 0, _tabIndex, () => setState(() => _tabIndex = 0)),
              _TabButton("理赔中心", 1, _tabIndex, () => setState(() => _tabIndex = 1)),
              _TabButton("产品市场", 2, _tabIndex, () => setState(() => _tabIndex = 2)),
            ],
          ),
          const Divider(height: 1),
          Expanded(child: _tabIndex == 0 ? _buildPolicies() : _tabIndex == 1 ? _buildClaims() : _buildMarket()),
        ],
      ),
    );
  }

  Widget _buildPolicies() {
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: _policies.length,
      itemBuilder: (_, i) {
        final p = _policies[i];
        return Card(
          child: ListTile(
            leading: CircleAvatar(backgroundColor: Colors.teal.shade100, child: Icon(p.icon, color: Colors.teal)),
            title: Text(p.name, style: const TextStyle(fontWeight: FontWeight.bold)),
            subtitle: Text("\${p.type} · 保额 \${p.coverage} · 保费 \${p.premium}"),
            trailing: Chip(label: Text(p.status, style: TextStyle(fontSize: 11, color: p.status == "生效中" ? Colors.green : Colors.orange))),
            onTap: () => _showPolicyDetail(p),
          ),
        );
      },
    );
  }

  Widget _buildClaims() {
    return Column(
      children: [
        Expanded(
          child: ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: _claims.length,
            itemBuilder: (_, i) {
              final c = _claims[i];
              return Card(
                child: ListTile(
                  leading: const Icon(Icons.receipt_long, color: Colors.orange),
                  title: Text(c.policyName),
                  subtitle: Text("\${c.amount} · \${c.status} · \${c.description}"),
                  trailing: Text("\${c.date.month}/\${c.date.day}", style: const TextStyle(color: Colors.grey, fontSize: 12)),
                ),
              );
            },
          ),
        ),
        SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: SizedBox(
              width: double.infinity,
              child: FilledButton.icon(
                onPressed: _fileNewClaim,
                icon: const Icon(Icons.add),
                label: const Text("发起理赔"),
                style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(48)),
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildMarket() {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        _ProductCard("健康险", "百万医疗险", "最高 ¥6,000,000 保额，覆盖住院/手术/门诊", "¥368/年起"),
        _ProductCard("车险", "机动车综合险", "交强险 + 三者 + 车损 + 不计免赔", "¥3,200/年起"),
        _ProductCard("旅行险", "全球旅行险", "医疗/行李/航班延误/紧急救援", "¥58/年起"),
        _ProductCard("寿险", "定期寿险", "给家人的保障，最高 ¥5,000,000", "¥1,200/年起"),
        _ProductCard("宠物险", "宠物医疗险", "猫狗疾病/意外/手术/第三方责任", "¥198/年起"),
      ],
    );
  }

  void _showPolicyDetail(_Policy p) {
    showModalBottomSheet(
      context: context,
      builder: (_) => Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(p.name, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
            const SizedBox(height: 16),
            _detailRow("保险类型", p.type),
            _detailRow("保额", p.coverage),
            _detailRow("年保费", p.premium),
            _detailRow("状态", p.status),
            _detailRow("免赔额", "¥$_deductible"),
            const SizedBox(height: 16),
            const Text("⚠ 本模板为保险业务演示。实际保险产品需：保险公司牌照 + 精算定价 + 监管报备 + 理赔调查系统。", style: TextStyle(color: Colors.orange, fontSize: 12)),
          ],
        ),
      ),
    );
  }

  Widget _detailRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [Text(label, style: const TextStyle(color: Colors.grey)), Text(value, style: const TextStyle(fontWeight: FontWeight.w600))],
      ),
    );
  }

  void _fileNewClaim() {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text("理赔申请"),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text("选择保单"), const SizedBox(height: 8),
            ..._policies.take(3).map((p) => ListTile(title: Text(p.name), dense: true, onTap: () => Navigator.pop(ctx))),
            const SizedBox(height: 12),
            const Text("理赔金额"), TextField(keyboardType: TextInputType.number, decoration: const InputDecoration(hintText: "¥ 0.00", border: OutlineInputBorder())),
            const SizedBox(height: 12),
            const Text("事故说明"), TextField(maxLines: 3, decoration: const InputDecoration(hintText: "请描述事故经过…", border: OutlineInputBorder())),
            const SizedBox(height: 12),
            const Text("免责额"), Slider(value: _deductible, min: 0, max: 2000, divisions: 20, label: "\\u00a5" + _deductible.toInt().toString(), onChanged: (v) {}),
            CheckboxListTile(title: const Text("我确认以上信息真实有效"), value: _agreeTerms, onChanged: (v) {}),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text("取消")),
          FilledButton(
            onPressed: () {
              Navigator.pop(ctx);
              ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text("理赔申请需要保险公司后端审核系统"), backgroundColor: Colors.orange));
            },
            child: const Text("提交申请"),
          ),
        ],
      ),
    );
  }
}

class _ProductCard extends StatelessWidget {
  final String category;
  final String name;
  final String desc;
  final String price;
  const _ProductCard(this.category, this.name, this.desc, this.price);

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Chip(label: Text(category, style: const TextStyle(fontSize: 11))),
                const Spacer(),
                Text(price, style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.teal, fontSize: 16)),
              ],
            ),
            const SizedBox(height: 8),
            Text(name, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 4),
            Text(desc, style: const TextStyle(color: Colors.grey, fontSize: 13)),
          ],
        ),
      ),
    );
  }
}

class _TabButton extends StatelessWidget {
  final String label;
  final int index;
  final int current;
  final VoidCallback onTap;
  const _TabButton(this.label, this.index, this.current, this.onTap);

  @override
  Widget build(BuildContext context) {
    final active = index == current;
    return Expanded(
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 14),
          decoration: BoxDecoration(border: Border(bottom: BorderSide(color: active ? Colors.teal : Colors.transparent, width: 2))),
          child: Text(label, textAlign: TextAlign.center, style: TextStyle(color: active ? Colors.teal : Colors.grey, fontWeight: active ? FontWeight.bold : FontWeight.normal)),
        ),
      ),
    );
  }
}
`;
}

// ─── KYC 身份验证 ───
export function emitFlutterKYCVerification(): string {
  return `import "package:flutter/material.dart";

/// KYC (Know Your Customer) 身份验证页面
/// 银行/保险/金融必需的身份验证流程
class KYCVerificationPage extends StatefulWidget {
  const KYCVerificationPage({super.key});

  @override
  State<KYCVerificationPage> createState() => _KYCVerificationPageState();
}

enum KYCLevel { basic, intermediate, advanced }

class _KYCVerificationPageState extends State<KYCVerificationPage> {
  int _step = 0;
  final _nameController = TextEditingController(text: "张三");
  final _idNumberController = TextEditingController(text: "110101199001011234");
  final _phoneController = TextEditingController(text: "+86 138****8888");
  bool _faceVerified = false;
  bool _docUploaded = false;

  @override
  void dispose() {
    _nameController.dispose();
    _idNumberController.dispose();
    _phoneController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text("身份验证")),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          // 进度指示器
          LinearProgressIndicator(value: (_step + 1) / 4, backgroundColor: Colors.grey.shade200),
          const SizedBox(height: 24),

          if (_step == 0) ...[
            const Text("基本信息", style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold)),
            const SizedBox(height: 16),
            TextFormField(controller: _nameController, decoration: const InputDecoration(labelText: "法定姓名", border: OutlineInputBorder(), prefixIcon: Icon(Icons.person))),
            const SizedBox(height: 12),
            TextFormField(controller: _idNumberController, decoration: const InputDecoration(labelText: "身份证号", border: OutlineInputBorder(), prefixIcon: Icon(Icons.credit_card)), maxLength: 18),
            const SizedBox(height: 12),
            TextFormField(controller: _phoneController, decoration: const InputDecoration(labelText: "手机号", border: OutlineInputBorder(), prefixIcon: Icon(Icons.phone_android))),
          ],

          if (_step == 1) ...[
            const Text("证件上传", style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold)),
            const SizedBox(height: 16),
            _uploadCard("身份证正面 (人像面)", Icons.credit_card, _docUploaded),
            const SizedBox(height: 12),
            _uploadCard("身份证背面 (国徽面)", Icons.credit_card, false),
            const SizedBox(height: 12),
            _uploadCard("手持身份证照片", Icons.person, false),
          ],

          if (_step == 2) ...[
            const Text("人脸识别", style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold)),
            const SizedBox(height: 16),
            Container(
              height: 200,
              decoration: BoxDecoration(border: Border.all(color: Colors.grey.shade300), borderRadius: BorderRadius.circular(12), color: Colors.grey.shade100),
              child: Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(_faceVerified ? Icons.check_circle : Icons.face, size: 64, color: _faceVerified ? Colors.green : Colors.grey),
                    const SizedBox(height: 8),
                    Text(_faceVerified ? "人脸验证通过 ✅" : "点击开始人脸识别", style: const TextStyle(fontSize: 15)),
                    const SizedBox(height: 12),
                    if (!_faceVerified)
                      FilledButton.icon(onPressed: () => setState(() => _faceVerified = true), icon: const Icon(Icons.face), label: const Text("开始人脸识别")),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 8),
            const Text("要求：光线充足 · 正面免冠 · 无遮挡 · 非翻拍", style: TextStyle(fontSize: 11, color: Colors.grey)),
          ],

          if (_step == 3) ...[
            const Text("审核结果", style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold)),
            const SizedBox(height: 16),
            const Icon(Icons.hourglass_bottom, size: 64, color: Colors.orange),
            const SizedBox(height: 12),
            const Text("您的身份验证信息已提交", style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600), textAlign: TextAlign.center),
            const SizedBox(height: 8),
            const Text("我们将在 1-3 个工作日内审核完成。\n审核通过后将解锁全部功能。", textAlign: TextAlign.center, style: TextStyle(color: Colors.grey)),
            const SizedBox(height: 16),
            _kycDetail("姓名", _nameController.text),
            _kycDetail("身份证", _idNumberController.text.replaceRange(6, 14, "****")),
            _kycDetail("手机号", _phoneController.text),
            _kycDetail("验证等级", "高级 (Advanced)"),
          ],

          const SizedBox(height: 32),
          Row(
            children: [
              if (_step > 0)
                Expanded(child: OutlinedButton(onPressed: () => setState(() => _step--), child: const Text("上一步"))),
              if (_step > 0) const SizedBox(width: 12),
              Expanded(
                child: FilledButton(
                  onPressed: () {
                    if (_step < 3) { setState(() => _step++); }
                    else {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text("KYC 审核需要合规身份验证服务商（如 Jumio/Onfido）"), backgroundColor: Colors.orange),
                      );
                    }
                  },
                  child: Text(_step < 3 ? "下一步" : "提交审核"),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          const Text("🔒 数据经 AES-256 加密传输 · 符合 GDPR / 个人信息保护法", style: TextStyle(fontSize: 11, color: Colors.grey), textAlign: TextAlign.center),
        ],
      ),
    );
  }

  Widget _uploadCard(String label, IconData icon, bool uploaded) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(border: Border.all(color: uploaded ? Colors.green : Colors.grey.shade300), borderRadius: BorderRadius.circular(8), color: uploaded ? Colors.green.shade50 : null),
      child: Row(
        children: [
          Icon(icon, color: uploaded ? Colors.green : Colors.grey),
          const SizedBox(width: 12),
          Expanded(child: Text(label, style: TextStyle(color: uploaded ? Colors.green : Colors.black87))),
          Icon(uploaded ? Icons.check_circle : Icons.cloud_upload, color: uploaded ? Colors.green : Colors.grey),
        ],
      ),
    );
  }

  Widget _kycDetail(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
        Text(label, style: const TextStyle(color: Colors.grey)),
        Text(value, style: const TextStyle(fontWeight: FontWeight.w600)),
      ]),
    );
  }
}
`;
}

// ─── 保险理赔 DDL ───
export function emitFintechDDL(): string {
  return `-- ======================================
-- 金融保险后端 DDL
-- ======================================

-- 保单表
create table if not exists insurance_policies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  type text not null,
  name text not null,
  coverage_amount numeric(12,2),
  premium_amount numeric(12,2),
  status text default 'active',
  start_date date,
  end_date date,
  created_at timestamptz default now()
);

-- 理赔表
create table if not exists insurance_claims (
  id uuid primary key default gen_random_uuid(),
  policy_id uuid references insurance_policies(id),
  user_id uuid references auth.users(id),
  amount numeric(12,2),
  description text,
  status text default 'pending',
  filed_at timestamptz default now(),
  resolved_at timestamptz
);

-- 支付交易表
create table if not exists payment_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  amount numeric(12,2),
  currency text default 'USD',
  method text,
  status text default 'pending',
  payment_intent_id text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

-- KYC 验证记录
create table if not exists kyc_verifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) unique,
  full_name text,
  id_number text,
  document_verified boolean default false,
  face_verified boolean default false,
  level text default 'none',
  verified_at timestamptz,
  created_at timestamptz default now()
);

-- RLS
alter table insurance_policies enable row level security;
alter table insurance_claims enable row level security;
alter table payment_transactions enable row level security;
alter table kyc_verifications enable row level security;

create policy "用户可查看自己的保单" on insurance_policies for select using (auth.uid() = user_id);
create policy "用户可查看自己的理赔" on insurance_claims for select using (auth.uid() = user_id);
create policy "用户可提交理赔" on insurance_claims for insert with check (auth.uid() = user_id);
create policy "用户可查看自己的交易" on payment_transactions for select using (auth.uid() = user_id);
create policy "用户可查看自己的KYC" on kyc_verifications for select using (auth.uid() = user_id);
create policy "用户可提交KYC" on kyc_verifications for insert with check (auth.uid() = user_id);
`;
}
