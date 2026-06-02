/**
 * 界面精致化：精美 Flutter 组件库
 * 替代原生 Material 组件，提供统一设计语言
 */

export function emitPolishedWidgetsDart(): string {
  return `import "package:flutter/material.dart";

/// ─── 精美空状态 ───
class AppEmptyState extends StatelessWidget {
  const AppEmptyState({super.key, required this.icon, required this.title, this.subtitle, this.onAction, this.actionLabel});
  final IconData icon;
  final String title;
  final String? subtitle;
  final VoidCallback? onAction;
  final String? actionLabel;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(40),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 80, height: 80,
              decoration: BoxDecoration(
                color: theme.colorScheme.primaryContainer.withAlpha(77),
                shape: BoxShape.circle,
              ),
              child: Icon(icon, size: 40, color: theme.colorScheme.primary.withAlpha(153)),
            ),
            const SizedBox(height: 20),
            Text(title, style: theme.textTheme.titleMedium?.copyWith(color: theme.colorScheme.onSurface.withAlpha(179)), textAlign: TextAlign.center),
            if (subtitle != null) ...[
              const SizedBox(height: 8),
              Text(subtitle!, style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.onSurface.withAlpha(102)), textAlign: TextAlign.center),
            ],
            if (onAction != null && actionLabel != null) ...[
              const SizedBox(height: 20),
              FilledButton.tonal(onPressed: onAction, child: Text(actionLabel!)),
            ],
          ],
        ),
      ),
    );
  }
}

/// ─── 加载骨架屏 ───
class AppLoadingSkeleton extends StatelessWidget {
  const AppLoadingSkeleton({super.key, this.count = 5});
  final int count;

  @override
  Widget build(BuildContext context) {
    return ListView.separated(
      padding: const EdgeInsets.all(16),
      itemCount: count,
      separatorBuilder: (_, __) => const SizedBox(height: 10),
      itemBuilder: (_, __) => Container(
        height: 80,
        decoration: BoxDecoration(
          color: Colors.grey.shade100,
          borderRadius: BorderRadius.circular(12),
        ),
      ),
    );
  }
}

/// ─── 精美卡片 ───
class AppCard extends StatelessWidget {
  const AppCard({super.key, required this.child, this.onTap, this.elevation = 1});
  final Widget child;
  final VoidCallback? onTap;
  final double elevation;

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: elevation,
      shadowColor: Colors.black.withAlpha(20),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(14),
        child: Padding(padding: const EdgeInsets.all(16), child: child),
      ),
    );
  }
}

/// ─── 搜索栏 ───
class AppSearchBar extends StatelessWidget {
  const AppSearchBar({super.key, required this.controller, required this.onChanged, this.hint = "搜索…"});
  final TextEditingController controller;
  final ValueChanged<String> onChanged;
  final String hint;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 4),
      child: TextField(
        controller: controller,
        onChanged: onChanged,
        decoration: InputDecoration(
          hintText: hint,
          prefixIcon: const Icon(Icons.search, size: 20),
          suffixIcon: controller.text.isNotEmpty ? IconButton(icon: const Icon(Icons.clear, size: 18), onPressed: () { controller.clear(); onChanged(""); }) : null,
          filled: true,
          fillColor: Theme.of(context).colorScheme.surfaceContainerHighest.withAlpha(77),
          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
          isDense: true,
        ),
      ),
    );
  }
}

/// ─── 列表项（带图片缩略图） ───
class AppListItem extends StatelessWidget {
  const AppListItem({super.key, required this.title, this.subtitle, this.imageUrl, this.leading, this.trailing, this.onTap});
  final String title;
  final String? subtitle;
  final String? imageUrl;
  final Widget? leading;
  final Widget? trailing;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return AppCard(
      onTap: onTap,
      child: Row(
        children: [
          if (imageUrl != null)
            ClipRRect(
              borderRadius: BorderRadius.circular(10),
              child: Image.network(imageUrl!, width: 56, height: 56, fit: BoxFit.cover, errorBuilder: (_, __, ___) => Container(width: 56, height: 56, decoration: BoxDecoration(color: theme.colorScheme.primaryContainer.withAlpha(77), borderRadius: BorderRadius.circular(10)), child: Icon(Icons.image, color: theme.colorScheme.primary.withAlpha(102)))),
            )
          else if (leading != null)
            leading!,
          if (imageUrl != null || leading != null) const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600), maxLines: 1, overflow: TextOverflow.ellipsis),
                if (subtitle != null) ...[const SizedBox(height: 4), Text(subtitle!, style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.onSurface.withAlpha(128)), maxLines: 1, overflow: TextOverflow.ellipsis)],
              ],
            ),
          ),
          if (trailing != null) trailing!,
        ],
      ),
    );
  }
}

/// ─── 错误提示卡片 ───
class AppErrorCard extends StatelessWidget {
  const AppErrorCard({super.key, required this.message, this.onRetry});
  final String message;
  final VoidCallback? onRetry;

  @override
  Widget build(BuildContext context) {
    return Card(
      color: Colors.orange.shade50,
      margin: const EdgeInsets.all(16),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            const Icon(Icons.wifi_off, color: Colors.orange, size: 24),
            const SizedBox(width: 12),
            Expanded(child: Text(message, style: const TextStyle(color: Colors.orange, fontSize: 13))),
            if (onRetry != null) TextButton(onPressed: onRetry, child: const Text("重试")),
          ],
        ),
      ),
    );
  }
}
`;
}
