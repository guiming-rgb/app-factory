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
