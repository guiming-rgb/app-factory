import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../core/theme/app_theme.dart';
import '../services/fitness_service.dart';
import '../../../core/supabase/supabase_client.dart';

class WorkoutDetailPage extends StatefulWidget {
  final String itemId;
  const WorkoutDetailPage({super.key, required this.itemId});
  @override
  State<WorkoutDetailPage> createState() => _WorkoutDetailPageState();
}

class _WorkoutDetailPageState extends State<WorkoutDetailPage> {
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
      final result = await client
          .from("workouts")
          .select("*")
          .eq("id", widget.itemId)
          .maybeSingle();
      setState(() { _item = result as Map<String, dynamic>?; _loading = false; });
    } catch (e) {
      setState(() { _error = e.toString(); _loading = false; });
    }
  }

  Map<String, dynamic> _sampleData() {
    return {
      'id': 'demo-1',
      'name': 'HIIT 全身燃脂训练',
      'level': '中级',
      'duration_min': 30,
      'calories': 320,
      'type': 'cardio',
      'image': 'https://picsum.photos/seed/workout1/800/400',
      'instructions': '1. 热身 5 分钟：开合跳 + 高抬腿\n'
          '2. 波比跳 40 秒，休息 20 秒\n'
          '3. 登山跑 40 秒，休息 20 秒\n'
          '4. 深蹲跳 40 秒，休息 20 秒\n'
          '5. 平板支撑交替摸肩 40 秒，休息 20 秒\n'
          '6. 重复 2-5 轮 3 组\n'
          '7. 拉伸放松 5 分钟',
      'created_at': '2026-06-24T07:00:00Z',
    };
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      appBar: AppBar(title: Text(_item?['name'] ?? _item?['title'] ?? '训练详情')),
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

    // Image
    if (item['image'] != null && item['image'].toString().isNotEmpty) {
      list.add(ClipRRect(
        borderRadius: BorderRadius.circular(12),
        child: Image.network(
          item['image'].toString(),
          height: 200,
          width: double.infinity,
          fit: BoxFit.cover,
          errorBuilder: (_, __, ___) => Container(
            height: 200,
            color: Colors.grey.shade200,
            child: const Center(child: Icon(Icons.fitness_center, size: 48, color: Colors.grey)),
          ),
          loadingBuilder: (_, child, progress) =>
              progress == null ? child : const SizedBox(height: 200, child: Center(child: CircularProgressIndicator())),
        ),
      ));
      list.add(const SizedBox(height: 16));
    }

    // Name
    list.add(Row(crossAxisAlignment: CrossAxisAlignment.center, children: [
      Expanded(
        child: Text(
          item['name'] ?? '',
          style: theme.textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.bold),
        ),
      ),
      // Level badge
      if (item['level'] != null)
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
          decoration: BoxDecoration(
            color: _levelColor(item['level'].toString()).withValues(alpha: 0.15),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Text(
            item['level'].toString(),
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w600,
              color: _levelColor(item['level'].toString()),
            ),
          ),
        ),
    ]));
    list.add(const SizedBox(height: 12));

    // Stats row
    list.add(Row(children: [
      _statChip(Icons.timer, '${item['duration_min'] ?? 0} 分钟'),
      const SizedBox(width: 16),
      _statChip(Icons.local_fire_department, '${item['calories'] ?? 0} 千卡'),
      const SizedBox(width: 16),
      if (item['type'] != null)
        _statChip(Icons.category, item['type'].toString()),
    ]));
    list.add(const SizedBox(height: 20));

    // Instructions
    if (item['instructions'] != null && item['instructions'].toString().isNotEmpty) {
      list.add(Text('训练步骤', style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600)));
      list.add(const SizedBox(height: 8));
      list.add(Container(
        width: double.infinity,
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.green.shade50,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Text(
          item['instructions'].toString(),
          style: TextStyle(fontSize: 14, height: 1.6, color: Colors.green.shade900),
        ),
      ));
    }

    return list;
  }

  Widget _statChip(IconData icon, String label) {
    return Row(mainAxisSize: MainAxisSize.min, children: [
      Icon(icon, size: 16, color: Colors.grey.shade600),
      const SizedBox(width: 4),
      Text(label, style: TextStyle(fontSize: 13, color: Colors.grey.shade700)),
    ]);
  }

  Color _levelColor(String level) {
    switch (level) {
      case '初级':
        return Colors.green;
      case '中级':
        return Colors.orange;
      case '高级':
        return Colors.red;
      default:
        return Colors.grey;
    }
  }
}
