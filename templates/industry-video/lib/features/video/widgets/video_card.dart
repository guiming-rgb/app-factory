import 'package:flutter/material.dart';
import '../../../core/theme/app_theme.dart';

class VideoCard extends StatelessWidget {
  final Map<String,dynamic> item;
  final VoidCallback? onTap;
  const VideoCard({super.key, required this.item, this.onTap});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final name = (item['name']??item['title']??'').toString();
    return Card(
      child: ListTile(
        leading: CircleAvatar(child: Text(name.isNotEmpty ? name[0].toUpperCase() : '?')),
        title: Text(name, style: const TextStyle(fontWeight: FontWeight.w600)),
        subtitle: Text(item['views']?.toString() ?? '', style: AppTheme.caption(theme.textTheme)),
        trailing: const Icon(Icons.chevron_right),
        onTap: onTap,
      ),
    );
  }
}
