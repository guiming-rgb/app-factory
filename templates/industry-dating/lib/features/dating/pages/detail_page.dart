import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../core/theme/app_theme.dart';
import '../services/dating_service.dart';
import '../../../core/supabase/supabase_client.dart';

class ProfileDetailPage extends StatefulWidget {
  final String itemId;
  const ProfileDetailPage({super.key, required this.itemId});
  @override
  State<ProfileDetailPage> createState() => _ProfileDetailPageState();
}

class _ProfileDetailPageState extends State<ProfileDetailPage> {
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
      final result = await DatingService(client).getProfile(widget.itemId);
      setState(() { _item = result; _loading = false; });
    } catch (e) {
      setState(() { _error = e.toString(); _loading = false; });
    }
  }

  Map<String, dynamic> _sampleData() {
    return {
      'id': 'demo-1',
      'display_name': '林小雨',
      'age': 26,
      'gender': '女',
      'bio': '热爱生活，喜欢旅行和摄影。周末喜欢去咖啡馆看书，也爱户外徒步探索自然。希望能遇到志同道合的你～',
      'photos': [
        'https://picsum.photos/seed/portrait1/400/500',
        'https://picsum.photos/seed/portrait2/400/500',
        'https://picsum.photos/seed/portrait3/400/500',
      ],
      'interests': ['旅行', '摄影', '咖啡', '徒步', '阅读', '美食'],
      'city': '上海',
      'occupation': '设计师',
      'education': '本科',
      'height': 165,
      'created_at': '2026-06-01T12:00:00Z',
    };
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      appBar: AppBar(title: Text(_item?['display_name'] ?? _item?['name'] ?? '个人资料')),
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

    // Photos gallery
    if (item['photos'] != null) {
      final photos = item['photos'];
      if (photos is List && photos.isNotEmpty) {
        list.add(SizedBox(
          height: 360,
          child: PageView.builder(
            itemCount: photos.length,
            itemBuilder: (_, i) => Padding(
              padding: const EdgeInsets.symmetric(horizontal: 4),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(16),
                child: Image.network(
                  photos[i].toString(),
                  fit: BoxFit.cover,
                  width: double.infinity,
                  errorBuilder: (_, __, ___) => Container(
                    color: Colors.grey.shade200,
                    child: const Center(child: Icon(Icons.broken_image, size: 48, color: Colors.grey)),
                  ),
                  loadingBuilder: (_, child, progress) =>
                      progress == null ? child : const Center(child: CircularProgressIndicator()),
                ),
              ),
            ),
          ),
        ));
        list.add(const SizedBox(height: 12));
        // Page indicator dots
        if (photos.length > 1) {
          list.add(Center(
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: List.generate(photos.length, (i) => Container(
                margin: const EdgeInsets.symmetric(horizontal: 3),
                width: 8,
                height: 8,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: i == 0 ? Colors.teal : Colors.grey.shade300,
                ),
              )),
            ),
          ));
          list.add(const SizedBox(height: 12));
        }
      }
    }

    // Display name + age + gender
    list.add(Row(crossAxisAlignment: CrossAxisAlignment.end, children: [
      Text(
        item['display_name']?.toString() ?? '',
        style: theme.textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.bold),
      ),
      const SizedBox(width: 8),
      if (item['age'] != null)
        Text('${item['age']}岁', style: TextStyle(fontSize: 18, color: Colors.grey.shade600)),
      const SizedBox(width: 8),
      if (item['gender'] != null)
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
          decoration: BoxDecoration(
            color: item['gender'] == '女' ? Colors.pink.shade50 : Colors.blue.shade50,
            borderRadius: BorderRadius.circular(8),
          ),
          child: Text(
            item['gender'].toString(),
            style: TextStyle(fontSize: 12, color: item['gender'] == '女' ? Colors.pink : Colors.blue),
          ),
        ),
    ]));
    list.add(const SizedBox(height: 4));

    // Location
    list.add(Row(children: [
      const Icon(Icons.location_on, size: 14, color: Colors.grey),
      const SizedBox(width: 4),
      Text(item['city']?.toString() ?? '', style: AppTheme.caption(theme.textTheme)),
      if (item['occupation'] != null) ...[
        const SizedBox(width: 16),
        const Icon(Icons.work, size: 14, color: Colors.grey),
        const SizedBox(width: 4),
        Text(item['occupation'].toString(), style: AppTheme.caption(theme.textTheme)),
      ],
    ]));
    list.add(const SizedBox(height: 16));

    // Bio
    if (item['bio'] != null && item['bio'].toString().isNotEmpty) {
      list.add(Text('关于我', style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600)));
      list.add(const SizedBox(height: 6));
      list.add(Text(item['bio'].toString(), style: AppTheme.bodyText(theme.textTheme)));
      list.add(const SizedBox(height: 16));
    }

    // Interests (chips)
    if (item['interests'] != null) {
      final interests = item['interests'];
      if (interests is List && interests.isNotEmpty) {
        list.add(Text('兴趣爱好', style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600)));
        list.add(const SizedBox(height: 8));
        list.add(Wrap(
          spacing: 8,
          runSpacing: 6,
          children: interests.map<Widget>((tag) => Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
            decoration: BoxDecoration(
              color: Colors.teal.shade50,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: Colors.teal.shade200),
            ),
            child: Text(tag.toString(), style: TextStyle(fontSize: 13, color: Colors.teal.shade700)),
          )).toList(),
        ));
      }
    }

    return list;
  }
}
