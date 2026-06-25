import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../core/theme/app_theme.dart';
import '../services/education_service.dart';
import '../../../core/supabase/supabase_client.dart';

class CourseDetailPage extends StatefulWidget {
  final String itemId;
  const CourseDetailPage({super.key, required this.itemId});
  @override
  State<CourseDetailPage> createState() => _CourseDetailPageState();
}

class _CourseDetailPageState extends State<CourseDetailPage> {
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
          .from("courses")
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
      'name': 'Python 数据分析与机器学习',
      'teacher': '李教授',
      'room': '教学楼 A301',
      'day_of_week': 1,
      'start_time': '14:00',
      'end_time': '15:30',
      'student_count': 45,
      'description': '本课程系统讲解 Python 在数据分析与机器学习领域的应用，'
          '涵盖 NumPy、Pandas、Matplotlib、Scikit-learn 等核心库的使用。',
      'weeks': 16,
      'credits': 3,
      'created_at': '2026-02-20T00:00:00Z',
    };
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      appBar: AppBar(title: Text(_item?['name'] ?? _item?['title'] ?? '课程详情')),
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

    // Course name
    list.add(Text(
      item['name'] ?? '',
      style: theme.textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.bold),
    ));
    list.add(const SizedBox(height: 16));

    // Teacher
    list.add(_infoRow(
      icon: Icons.person,
      label: '授课教师',
      value: item['teacher']?.toString() ?? '',
    ));

    // Classroom
    list.add(_infoRow(
      icon: Icons.meeting_room,
      label: '教室',
      value: item['room']?.toString() ?? '',
    ));

    // Schedule
    final days = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
    final dayIdx = item['day_of_week'] is int ? (item['day_of_week'] as int) : -1;
    final dayLabel = dayIdx >= 0 && dayIdx < days.length ? days[dayIdx] : '';
    final schedule = [
      if (dayLabel.isNotEmpty) dayLabel,
      if (item['start_time'] != null) item['start_time'].toString(),
      if (item['end_time'] != null) '~ ${item['end_time']}',
    ].join(' ');
    if (schedule.isNotEmpty) {
      list.add(_infoRow(
        icon: Icons.schedule,
        label: '上课时间',
        value: schedule,
      ));
    }

    // Student count
    if (item['student_count'] != null) {
      list.add(_infoRow(
        icon: Icons.people,
        label: '学生人数',
        value: '${item['student_count']} 人',
      ));
    }

    // Credits
    if (item['credits'] != null) {
      list.add(_infoRow(
        icon: Icons.grade,
        label: '学分',
        value: '${item['credits']} 学分',
      ));
    }

    // Weeks
    if (item['weeks'] != null) {
      list.add(_infoRow(
        icon: Icons.date_range,
        label: '教学周数',
        value: '${item['weeks']} 周',
      ));
    }

    // Description
    if (item['description'] != null && item['description'].toString().isNotEmpty) {
      list.add(const SizedBox(height: 12));
      list.add(Text('课程简介', style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600)));
      list.add(const SizedBox(height: 6));
      list.add(Text(item['description'].toString(), style: AppTheme.bodyText(theme.textTheme)));
    }

    return list;
  }

  Widget _infoRow({required IconData icon, required String label, required String value}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(children: [
        Icon(icon, size: 20, color: Colors.grey.shade600),
        const SizedBox(width: 10),
        SizedBox(width: 80, child: Text(label, style: TextStyle(fontSize: 13, color: Colors.grey.shade600))),
        Expanded(
          child: Text(value, style: const TextStyle(fontSize: 15)),
        ),
      ]),
    );
  }
}
