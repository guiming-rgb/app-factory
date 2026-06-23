import "package:flutter/material.dart";

/// ─── 淘宝式：商品卡片（评分星+销量+价格对比） ───
class ProductCard extends StatelessWidget {
  const ProductCard({super.key, required this.name, required this.price, this.originalPrice, this.imageUrl, this.sales, this.rating, this.onTap});
  final String name;
  final double price;
  final double? originalPrice;
  final String? imageUrl;
  final int? sales;
  final double? rating;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final hasDiscount = originalPrice != null && originalPrice! > price;
    return GestureDetector(
      onTap: onTap,
      child: Container(
        decoration: BoxDecoration(color: theme.colorScheme.surface, borderRadius: BorderRadius.circular(14), boxShadow: [BoxShadow(color: Colors.black.withAlpha(8), blurRadius: 8, offset: const Offset(0, 2))]),
        clipBehavior: Clip.antiAlias,
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          if (imageUrl != null)
            AspectRatio(aspectRatio: 1, child: Image.network(imageUrl!, fit: BoxFit.cover, errorBuilder: (_, __, ___) => Container(color: theme.colorScheme.surfaceContainerHighest, child: const Icon(Icons.image, size: 40, color: Colors.grey)))),
          Padding(padding: const EdgeInsets.all(10), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(name, maxLines: 2, overflow: TextOverflow.ellipsis, style: theme.textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w600)),
            const SizedBox(height: 4),
            Row(children: [
              Text('¥\${price.toStringAsFixed(2)}', style: TextStyle(fontSize: 17, fontWeight: FontWeight.bold, color: theme.colorScheme.error)),
              if (hasDiscount) ...[
                const SizedBox(width: 6),
                Text('¥\${originalPrice!.toStringAsFixed(2)}', style: const TextStyle(fontSize: 12, decoration: TextDecoration.lineThrough, color: Colors.grey)),
              ],
              const Spacer(),
              if (sales != null && sales! > 0) Text('已售\$sales', style: const TextStyle(fontSize: 11, color: Colors.grey)),
            ]),
            if (rating != null) ...[const SizedBox(height: 4), Row(children: [Icon(Icons.star, size: 13, color: Colors.amber.shade700), const SizedBox(width: 2), Text(rating!.toStringAsFixed(1), style: const TextStyle(fontSize: 12, color: Colors.grey))])],
          ])),
        ]),
      ),
    );
  }
}

/// ─── Keep 式：进度环（训练完成度/目标进度） ───
class ProgressRing extends StatelessWidget {
  const ProgressRing({super.key, required this.progress, required this.label, required this.value, this.color, this.size = 80});
  final double progress; // 0.0-1.0
  final String label;
  final String value;
  final Color? color;
  final double size;

  @override
  Widget build(BuildContext context) {
    final c = color ?? Theme.of(context).colorScheme.primary;
    return SizedBox(width: size, height: size,
      child: Stack(alignment: Alignment.center, children: [
        SizedBox(width: size - 8, height: size - 8, child: CircularProgressIndicator(value: progress, strokeWidth: 6, backgroundColor: Colors.grey.shade200, valueColor: AlwaysStoppedAnimation(c))),
        Column(mainAxisSize: MainAxisSize.min, children: [Text(value, style: TextStyle(fontSize: size * 0.22, fontWeight: FontWeight.bold, color: c)), const SizedBox(height: 2), Text(label, style: const TextStyle(fontSize: 11, color: Colors.grey))]),
      ]),
    );
  }
}

/// ─── 美团式：筛选面板（底部弹出多选） ───
class FilterBottomSheet extends StatefulWidget {
  const FilterBottomSheet({super.key, required this.title, required this.options, required this.selected, required this.onApply});
  final String title;
  final List<String> options;
  final Set<String> selected;
  final ValueChanged<Set<String>> onApply;

  @override State<FilterBottomSheet> createState() => _FilterBottomSheetState();
  static Future<Set<String>?> show(BuildContext context, {required String title, required List<String> options, required Set<String> selected}) {
    return showModalBottomSheet<Set<String>>(context: context, isScrollControlled: true, shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))), builder: (_) => FilterBottomSheet(title: title, options: options, selected: selected, onApply: (_) {}));
  }
}
class _FilterBottomSheetState extends State<FilterBottomSheet> {
  late Set<String> _selected;
  @override void initState() { super.initState(); _selected = {...widget.selected}; }
  @override Widget build(BuildContext context) {
    return Padding(padding: const EdgeInsets.fromLTRB(20, 16, 20, 32), child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
      Center(child: Container(width: 36, height: 4, decoration: BoxDecoration(color: Colors.grey.shade300, borderRadius: BorderRadius.circular(2)))),
      const SizedBox(height: 16),
      Text(widget.title, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
      const SizedBox(height: 12),
      Wrap(spacing: 8, runSpacing: 8, children: widget.options.map((o) => FilterChip(label: Text(o), selected: _selected.contains(o), onSelected: (v) { setState(() { v ? _selected.add(o) : _selected.remove(o); }); })).toList()),
      const SizedBox(height: 20),
      SizedBox(width: double.infinity, child: FilledButton(onPressed: () => Navigator.of(context).pop(_selected), child: const Text("应用筛选"))),
    ]));
  }
}

/// ─── 微信式：滑动操作（左滑删除/收藏） ───
class SwipeActionWrapper extends StatelessWidget {
  const SwipeActionWrapper({super.key, required this.child, this.onDelete, this.onFavorite, this.isFavorited = false});
  final Widget child;
  final VoidCallback? onDelete;
  final VoidCallback? onFavorite;
  final bool isFavorited;

  @override
  Widget build(BuildContext context) {
    return Dismissible(
      key: UniqueKey(),
      background: Container(alignment: Alignment.centerLeft, padding: const EdgeInsets.only(left: 20), color: Colors.orange, child: const Icon(Icons.star, color: Colors.white)),
      secondaryBackground: Container(alignment: Alignment.centerRight, padding: const EdgeInsets.only(right: 20), color: Colors.red, child: const Icon(Icons.delete, color: Colors.white)),
      confirmDismiss: (direction) async {
        if (direction == DismissDirection.startToEnd) { onFavorite?.call(); return false; }
        if (direction == DismissDirection.endToStart) { onDelete?.call(); return true; }
        return false;
      },
      child: child,
    );
  }
}

/// ─── 随手记式：快捷记账 FAB 菜单 ───
class QuickAddFAB extends StatelessWidget {
  const QuickAddFAB({super.key, required this.items});
  final List<_QuickAction> items;

  @override
  Widget build(BuildContext context) {
    return FloatingActionButton(
      onPressed: () => showModalBottomSheet(context: context, shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))), builder: (_) => Padding(padding: const EdgeInsets.all(24), child: Column(mainAxisSize: MainAxisSize.min, children: [
        const Text("快速记录", style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
        const SizedBox(height: 16),
        ...items.map((a) => ListTile(leading: CircleAvatar(backgroundColor: a.color.withAlpha(30), child: Icon(a.icon, color: a.color, size: 20)), title: Text(a.label), onTap: () { Navigator.pop(context); a.onTap(); })),
      ]))),
      child: const Icon(Icons.add),
    );
  }
}
class _QuickAction { final String label; final IconData icon; final Color color; final VoidCallback onTap; const _QuickAction({required this.label, required this.icon, required this.color, required this.onTap}); }

/// ─── Salesforce 式：看板列（拖拽+状态流转） ───
class KanbanColumn extends StatelessWidget {
  const KanbanColumn({super.key, required this.title, required this.color, required this.items, required this.onTapItem});
  final String title;
  final Color color;
  final List<_KanbanItem> items;
  final ValueChanged<String> onTapItem;

  @override
  Widget build(BuildContext context) {
    return Container(width: 240, margin: const EdgeInsets.only(right: 12), decoration: BoxDecoration(color: Colors.grey.shade50, borderRadius: BorderRadius.circular(14)), child: Column(children: [
      Padding(padding: const EdgeInsets.all(12), child: Row(children: [Container(width: 10, height: 10, decoration: BoxDecoration(color: color, shape: BoxShape.circle)), const SizedBox(width: 8), Text(title, style: const TextStyle(fontWeight: FontWeight.bold)), const Spacer(), Text('\${items.length}', style: const TextStyle(color: Colors.grey, fontSize: 13))])),
      Expanded(child: ListView(padding: const EdgeInsets.fromLTRB(8, 0, 8, 8), children: items.map((item) => Card(child: ListTile(title: Text(item.title, style: const TextStyle(fontSize: 14)), subtitle: item.subtitle != null ? Text(item.subtitle!, style: const TextStyle(fontSize: 12)) : null, onTap: () => onTapItem(item.id), dense: true))).toList())),
    ]));
  }
}
class _KanbanItem { final String id; final String title; final String? subtitle; const _KanbanItem({required this.id, required this.title, this.subtitle}); }

/// ─── 小红书式：骨架动效（微光扫过） ───
class ShimmerSkeleton extends StatefulWidget {
  const ShimmerSkeleton({super.key, this.count = 3});
  final int count;
  @override State<ShimmerSkeleton> createState() => _ShimmerSkeletonState();
}
class _ShimmerSkeletonState extends State<ShimmerSkeleton> with SingleTickerProviderStateMixin {
  late final _controller = AnimationController(vsync: this, duration: const Duration(milliseconds: 1500))..repeat();
  @override void dispose() { _controller.dispose(); super.dispose(); }
  @override Widget build(BuildContext context) {
    return AnimatedBuilder(animation: _controller, builder: (_, child) {
      final gradient = LinearGradient(begin: Alignment.topLeft, end: Alignment.bottomRight, colors: [Colors.grey.shade100, Colors.grey.shade300, Colors.grey.shade100], stops: [0.0, 0.5, 1.0]);
      return ListView.separated(padding: const EdgeInsets.all(16), itemCount: widget.count, separatorBuilder: (_, __) => const SizedBox(height: 10), itemBuilder: (_, __) => Container(height: 80, decoration: BoxDecoration(borderRadius: BorderRadius.circular(12), gradient: gradient)));
    });
  }
}

/// ─── 通用：底部常驻操作栏（淘宝购物车） ───
class BottomActionBar extends StatelessWidget {
  const BottomActionBar({super.key, required this.total, this.totalLabel, required this.buttonLabel, required this.onButtonTap, this.onTotalTap});
  final String total;
  final String? totalLabel;
  final String buttonLabel;
  final VoidCallback onButtonTap;
  final VoidCallback? onTotalTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      padding: const EdgeInsets.fromLTRB(20, 12, 20, 12),
      decoration: BoxDecoration(color: theme.colorScheme.surface, boxShadow: [BoxShadow(color: Colors.black.withAlpha(8), blurRadius: 8, offset: const Offset(0, -2))]),
      child: SafeArea(child: Row(children: [
        Expanded(child: GestureDetector(onTap: onTotalTap, child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [Text(totalLabel ?? "合计", style: const TextStyle(fontSize: 12, color: Colors.grey)), Text(total, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Colors.red))]))),
        SizedBox(width: 100, child: FilledButton(onPressed: onButtonTap, style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(44), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(22))), child: Text(buttonLabel, style: const TextStyle(fontSize: 16)))),
      ])),
    );
  }
}
