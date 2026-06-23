import "package:flutter/material.dart";

import "../../privacy/presentation/privacy_page.dart";

class ProfilePage extends StatelessWidget {
  const ProfilePage({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      appBar: AppBar(title: const Text("我的")),
      body: ListView(
        children: [
          // 用户头像区
          Container(
            padding: const EdgeInsets.all(24),
            color: theme.colorScheme.primaryContainer,
            child: Column(
              children: [
                CircleAvatar(
                  radius: 36,
                  backgroundColor: theme.colorScheme.primary,
                  child: const Icon(Icons.person, size: 36, color: Colors.white),
                ),
                const SizedBox(height: 12),
                Text("用户", style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold)),
              ],
            ),
          ),
          const SizedBox(height: 8),
          // 功能列表
          _MenuItem(icon: Icons.dark_mode, title: "深色模式", trailing: Switch(value: theme.brightness == Brightness.dark, onChanged: (_) => ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text("深色模式需系统设置中切换"))))),
          _MenuItem(icon: Icons.privacy_tip_outlined, title: "隐私政策", onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const PrivacyPage()))),
          _MenuItem(icon: Icons.delete_outline, title: "删除数据", onTap: () => showDialog(context: context, builder: (_) => AlertDialog(title: const Text("删除全部数据"), content: const Text("此操作不可撤销"), actions: [TextButton(onPressed: () => Navigator.pop(context), child: const Text("取消")), FilledButton(onPressed: () { Navigator.pop(context); ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text("请求已提交"))); }, style: FilledButton.styleFrom(backgroundColor: Colors.red), child: const Text("确认删除"))]))),
          const Divider(),
          _MenuItem(icon: Icons.info_outline, title: "关于", subtitle: "App 生产工厂 · 自动生成"),
        ],
      ),
    );
  }
}

class _MenuItem extends StatelessWidget {
  const _MenuItem({this.icon, required this.title, this.subtitle, this.trailing, this.onTap});
  final IconData? icon;
  final String title;
  final String? subtitle;
  final Widget? trailing;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return ListTile(
      leading: icon != null ? Icon(icon) : null,
      title: Text(title),
      subtitle: subtitle != null ? Text(subtitle!, style: const TextStyle(fontSize: 12)) : null,
      trailing: trailing ?? (onTap != null ? const Icon(Icons.chevron_right) : null),
      onTap: onTap,
    );
  }
}
