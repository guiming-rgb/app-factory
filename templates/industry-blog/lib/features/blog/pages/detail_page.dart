import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../core/theme/app_theme.dart';
import '../services/blog_service.dart';
import '../../../core/supabase/supabase_client.dart';

class ArticleDetailPage extends StatefulWidget {
  final String itemId;
  const ArticleDetailPage({super.key, required this.itemId});
  @override
  State<ArticleDetailPage> createState() => _ArticleDetailPageState();
}

class _ArticleDetailPageState extends State<ArticleDetailPage> {
  Map<String, dynamic>? _item;
  bool _loading = true;
  String? _error;
  bool _supabaseAvailable = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() { _loading = true; _error = null; });
    try {
      final client = supabaseOrNull;
      if (client == null) {
        setState(() { _item = _sampleData(); _loading = false; _supabaseAvailable = false; });
        return;
      }
      final result = await BlogService(client).getArticle(widget.itemId);
      setState(() { _item = result; _loading = false; });
    } catch (e) {
      setState(() { _error = e.toString(); _loading = false; });
    }
  }

  Map<String, dynamic> _sampleData() {
    return {
      'id': 'demo-1',
      'title': 'Flutter 跨平台开发实战指南',
      'summary': '从零开始掌握 Flutter 框架的核心概念与最佳实践，涵盖 Widget 树、状态管理和路由导航',
      'content': 'Flutter 是 Google 推出的开源 UI 工具包，用于从单一代码库构建跨平台应用。'
          '本文将从基础概念讲起，逐步深入到高级特性。\n\n## Widget 树\n\n'
          'Flutter 中一切皆 Widget。从 MaterialApp 到 Text，每一个界面元素都是 Widget。'
          '理解 Widget 树的构建与重建是掌握 Flutter 的第一步。\n\n## 状态管理\n\n'
          '状态管理是 Flutter 开发中的核心课题。从 setState 到 Provider，再到 BLoC，'
          '选择合适的方案取决于应用的复杂度。',
      'cover': 'https://picsum.photos/seed/article1/800/400',
      'author': '张明',
      'read_minutes': 12,
      'tags': ['Flutter', '跨平台', '移动开发', 'Dart'],
      'created_at': '2026-06-20T08:00:00Z',
    };
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      appBar: AppBar(title: Text(_item?['title'] ?? _item?['name'] ?? '文章详情')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                  const Icon(Icons.error_outline, size: 48, color: Colors.red),
                  const SizedBox(height: 12),
                  const Text('加载失败', style: TextStyle(fontSize: 16)),
                  const SizedBox(height: 8),
                  Text(_error!, style: AppTheme.caption(theme.textTheme)),
                  const SizedBox(height: 16),
                  ElevatedButton.icon(
                    onPressed: _load,
                    icon: const Icon(Icons.refresh),
                    label: const Text('重试'),
                  ),
                ]))
              : _item == null
                  ? const Center(child: Text('未找到'))
                  : ListView(padding: const EdgeInsets.all(16), children: [
                      if (!_supabaseAvailable)
                        Container(
                          padding: const EdgeInsets.all(12),
                          margin: const EdgeInsets.only(bottom: 12),
                          decoration: BoxDecoration(
                            color: Colors.orange.shade50,
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: const Row(children: [
                            Icon(Icons.info_outline, size: 16, color: Colors.orange),
                            SizedBox(width: 8),
                            Expanded(
                              child: Text('演示模式 — 配置 Supabase 后显示真实数据',
                                  style: TextStyle(fontSize: 12)),
                            ),
                          ]),
                        ),
                      ..._buildFields(),
                    ]),
    );
  }

  List<Widget> _buildFields() {
    final item = _item!;
    final theme = Theme.of(context);
    final list = <Widget>[];

    // Cover image
    if (item['cover'] != null && item['cover'].toString().isNotEmpty) {
      list.add(ClipRRect(
        borderRadius: BorderRadius.circular(12),
        child: Image.network(
          item['cover'].toString(),
          height: 200,
          width: double.infinity,
          fit: BoxFit.cover,
          errorBuilder: (_, __, ___) => Container(
            height: 200,
            color: Colors.grey.shade200,
            child: const Center(child: Icon(Icons.broken_image, size: 48, color: Colors.grey)),
          ),
          loadingBuilder: (_, child, progress) =>
              progress == null ? child : const SizedBox(height: 200, child: Center(child: CircularProgressIndicator())),
        ),
      ));
      list.add(const SizedBox(height: 16));
    }

    // Title
    list.add(Text(
      item['title'] ?? '',
      style: theme.textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.bold),
    ));
    list.add(const SizedBox(height: 8));

    // Author + read time row
    list.add(Row(children: [
      const Icon(Icons.person, size: 14, color: Colors.grey),
      const SizedBox(width: 4),
      Text(item['author']?.toString() ?? '', style: AppTheme.caption(theme.textTheme)),
      const SizedBox(width: 16),
      const Icon(Icons.access_time, size: 14, color: Colors.grey),
      const SizedBox(width: 4),
      Text('${item['read_minutes'] ?? 0} 分钟', style: AppTheme.caption(theme.textTheme)),
    ]));
    list.add(const SizedBox(height: 12));

    // Tags
    if (item['tags'] != null) {
      final tags = item['tags'];
      if (tags is List && tags.isNotEmpty) {
        list.add(Wrap(
          spacing: 6,
          runSpacing: 4,
          children: tags.map<Widget>((tag) => Chip(
            label: Text(tag.toString(), style: const TextStyle(fontSize: 12)),
            materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
            visualDensity: VisualDensity.compact,
          )).toList(),
        ));
        list.add(const SizedBox(height: 12));
      }
    }

    // Summary
    if (item['summary'] != null && item['summary'].toString().isNotEmpty) {
      list.add(Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: Colors.blue.shade50,
          borderRadius: BorderRadius.circular(8),
        ),
        child: Text(item['summary'].toString(),
            style: TextStyle(color: Colors.blue.shade800, fontStyle: FontStyle.italic)),
      ));
      list.add(const SizedBox(height: 12));
    }

    // Content
    if (item['content'] != null && item['content'].toString().isNotEmpty) {
      list.add(Text(
        item['content'].toString(),
        style: AppTheme.bodyText(theme.textTheme),
      ));
    }

    return list;
  }
}
