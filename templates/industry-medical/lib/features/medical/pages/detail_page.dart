import 'package:flutter/material.dart';
import '../../../core/supabase/supabase_client.dart';
import '../../../core/widgets/polished_widgets.dart';
import '../services/medical_service.dart';

class DoctorDetailPage extends StatefulWidget {
  final Map<String, dynamic> item;
  const DoctorDetailPage({super.key, required this.item});
  @override
  State<DoctorDetailPage> createState() => _DoctorDetailPageState();
}

class _DoctorDetailPageState extends State<DoctorDetailPage> {
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
        final service = MedicalService(client);
        final id = widget.item['id'];
        if (id != null) {
          try {
            final detail = await service.getDoctorDetail(id.toString());
            if (detail != null) { if (mounted) setState(() { _data = detail; _loading = false; }); return; }
          } catch (_) {}
        }
        _data = widget.item;
      } else {
        _data = {
          'name': '李华',
          'title': '主任医师',
          'hospital': '北京协和医院',
          'department': '心血管内科',
          'rating': 4.8,
          'consultation_fee': 300.0,
          'avatar': 'https://i.pravatar.cc/150?u=doctor1',
          'bio': '从事心血管内科临床工作30余年，擅长冠心病、高血压、心力衰竭等疾病的诊治。'
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
      appBar: AppBar(title: Text((_data?['name']??widget.item['name']??widget.item['title']??'').toString())),
      body: _loading
        ? const AppLoadingSkeleton()
        : _error != null
          ? AppErrorCard(message: _error!, onRetry: _load)
          : _data == null
            ? const AppEmptyState(icon: Icons.person_off, title: "未找到医生")
            : ListView(padding: const EdgeInsets.all(20), children: [
                Center(child: CircleAvatar(radius: 50, backgroundImage: _data!['avatar'] != null ? NetworkImage(_data!['avatar'].toString()) : null, child: _data!['avatar'] == null ? const Icon(Icons.person, size: 50) : null)),
                const SizedBox(height: 16),
                Center(child: Text(_data!['name']?.toString()??'', style: Theme.of(context).textTheme.headlineSmall)),
                Center(child: Text(_data!['title']?.toString()??'', style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: Colors.grey))),
                const SizedBox(height: 16),
                _fieldRow(context, Icons.business, '医院', _data!['hospital']?.toString()),
                _fieldRow(context, Icons.local_hospital, '科室', _data!['department']?.toString()),
                _fieldRow(context, Icons.star, '评分', _data!['rating']?.toString()),
                _fieldRow(context, Icons.attach_money, '咨询费', _data!['consultation_fee'] != null ? '¥${_data!['consultation_fee']}' : null),
                const SizedBox(height: 16),
                const Text('简介', style: TextStyle(fontWeight: FontWeight.bold)),
                const SizedBox(height: 8),
                Text(_data!['bio']?.toString()??'暂无简介'),
              ]),
    );
  }

  Widget _fieldRow(BuildContext context, IconData icon, String label, String? value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(children: [
        Icon(icon, size: 20, color: Colors.grey),
        const SizedBox(width: 8),
        Text('$label: ', style: const TextStyle(fontWeight: FontWeight.bold)),
        Expanded(child: Text(value??'--')),
      ]),
    );
  }
}
