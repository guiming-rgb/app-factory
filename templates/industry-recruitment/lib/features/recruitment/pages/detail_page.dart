import 'package:flutter/material.dart';
import '../../../core/supabase/supabase_client.dart';
import '../../../core/widgets/polished_widgets.dart';
import '../services/recruitment_service.dart';

class JobDetailPage extends StatefulWidget {
  final Map<String, dynamic> item;
  const JobDetailPage({super.key, required this.item});
  @override
  State<JobDetailPage> createState() => _JobDetailPageState();
}

class _JobDetailPageState extends State<JobDetailPage> {
  Map<String, dynamic>? _data;
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() { _loading = true; _error = null; });
    try {
      final client = supabaseOrNull;
      if (client != null) {
        final service = RecruitmentService(client);
        final id = widget.item['id'];
        if (id != null) {
          try {
            final jobs = await service.getJobs();
            if (jobs.isNotEmpty) {
              _data = jobs.first;
              if (mounted) { setState(() { _loading = false; }); return; }
            }
          } catch (_) {}
        }
        _data = widget.item;
      } else {
        _data = {
          'title': '高级前端工程师',
          'salary_min': 25000,
          'salary_max': 40000,
          'location': '北京·海淀',
          'experience': '3-5年',
          'education': '本科及以上',
          'skills': ['Vue.js', 'React', 'TypeScript', 'Webpack'],
          'company_name': '字节跳动',
        };
      }
    } catch (e) {
      _data = widget.item;
    }
    if (mounted) setState(() { _loading = false; });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(_data?['title']?.toString()??'职位详情')),
      body: _loading
        ? const AppLoadingSkeleton()
        : _error != null
          ? AppErrorCard(message: _error!, onRetry: _load)
          : _data == null
            ? const AppEmptyState(icon: Icons.work_off, title: "未找到职位")
            : ListView(padding: const EdgeInsets.all(20), children: [
                Text(_data!['title']?.toString()??'', style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.bold)),
                const SizedBox(height: 8),
                Text('¥${_data!['salary_min']??''} - ¥${_data!['salary_max']??''}/月', style: TextStyle(fontSize: 24, color: Theme.of(context).primaryColor, fontWeight: FontWeight.bold)),
                const SizedBox(height: 16),
                Card(child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(children: [
                    _infoRow(context, Icons.business, _data!['company_name']?.toString()),
                    const Divider(),
                    _infoRow(context, Icons.location_on, _data!['location']?.toString()),
                    const Divider(),
                    _infoRow(context, Icons.school, _data!['education']?.toString()),
                    const Divider(),
                    _infoRow(context, Icons.timeline, _data!['experience']?.toString()),
                  ]),
                )),
                if (_data!['skills'] != null) ...[
                  const SizedBox(height: 16),
                  const Text('技能要求', style: TextStyle(fontWeight: FontWeight.bold)),
                  const SizedBox(height: 8),
                  Wrap(spacing: 8, runSpacing: 4, children: ((_data!['skills'] as List?)??[]).map((s) => Chip(label: Text(s.toString(), style: const TextStyle(fontSize: 12)), backgroundColor: Theme.of(context).primaryColor.withOpacity(0.1))).toList()),
                ],
              ]),
    );
  }

  Widget _infoRow(BuildContext context, IconData icon, String? value) {
    return Row(children: [
      Icon(icon, size: 20, color: Colors.grey),
      const SizedBox(width: 12),
      Expanded(child: Text(value??'--')),
    ]);
  }
}
