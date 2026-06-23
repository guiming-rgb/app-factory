import "package:flutter/material.dart";

class HomePage extends StatelessWidget {
  const HomePage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text("首页")),
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text("记账本·真机样本", style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 8),
            Text("个人中心 · Spec placeholder"),
          ],
        ),
      ),
    );
  }
}
