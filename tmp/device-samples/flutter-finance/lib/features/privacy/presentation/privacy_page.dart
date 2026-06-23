import "package:flutter/material.dart";

class PrivacyPage extends StatelessWidget {
  const PrivacyPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text("隐私政策")),
      body: ListView(padding: const EdgeInsets.all(24), children: [
        const Icon(Icons.shield, size: 48, color: Colors.teal),
        const SizedBox(height: 16),
        Text("记账本·真机样本 隐私政策", style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.bold)),
        const SizedBox(height: 16),
        _section("1. 信息收集", "我们仅收集您主动提供的必要信息，包括邮箱地址（用于账号注册）和应用使用数据（用于改进服务）。"),
        _section("2. 数据存储", "您的数据存储在 Supabase 云数据库中，采用行级安全（RLS）策略进行隔离保护。数据传输全程加密。"),
        _section("3. 数据使用", "您的数据仅用于提供应用核心功能，不会出售或分享给第三方。"),
        _section("4. 数据删除", "您可以在应用内删除您的数据。如需彻底删除账号及全部关联数据，请联系 support@app-factory.dev。"),
        _section("5. 合规声明", "本应用遵循 GDPR（欧盟通用数据保护条例）和《个人信息保护法》的相关规定。"),
        const SizedBox(height: 16),
        OutlinedButton.icon(
          onPressed: () => showDialog(context: context, builder: (_) => AlertDialog(title: const Text("删除全部数据"), content: const Text("此操作将删除您的账号及所有关联数据，不可撤销。确定继续？"), actions: [
            TextButton(onPressed: () => Navigator.pop(context), child: const Text("取消")),
            FilledButton(onPressed: () { Navigator.pop(context); ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text("数据删除请求已提交"))); }, style: FilledButton.styleFrom(backgroundColor: Colors.red), child: const Text("确认删除")),
          ])),
          icon: const Icon(Icons.delete_forever, color: Colors.red),
          label: const Text("删除我的全部数据", style: TextStyle(color: Colors.red)),
        ),
      ]),
    );
  }

  Widget _section(String title, String body) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
        const SizedBox(height: 4),
        Text(body, style: const TextStyle(color: Colors.black87, height: 1.6)),
      ]),
    );
  }
}
