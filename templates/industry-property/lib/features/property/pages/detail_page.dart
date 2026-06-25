import 'package:flutter/material.dart';
import '../../../core/supabase/supabase_client.dart';
import '../../../core/widgets/polished_widgets.dart';
import '../services/property_service.dart';

class RepairDetailPage extends StatefulWidget {
  final Map<String, dynamic> item;
  const RepairDetailPage({super.key, required this.item});
  @override
  State<RepairDetailPage> createState() => _RepairDetailPageState();
}

class _RepairDetailPageState extends State<RepairDetailPage> {
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
        _data = widget.item;
      } else {
        _data = {
          'title': '厨房水龙头漏水',
          'description': '厨房水龙头关不紧，一直滴水，需要维修师傅上门检查修理。',
          'status': 'pending',
          'urgency': '高',
          'images': ['https://picsum.photos/seed/repair1/400/300'],
        };
      }
    } catch (e) {
      _data = widget.item;
    }
    if (mounted) setState(() { _loading = false; });
  }

  Color _statusColor(String? status) {
    switch (status) {
      case 'pending': return Colors.orange;
      case 'processing': return Colors.blue;
      case 'completed': return Colors.green;
      case 'cancelled': return Colors.grey;
      default: return Colors.grey;
    }
  }

  String _statusLabel(String? status) {
    switch (status) {
      case 'pending': return '待处理';
      case 'processing': return '处理中';
      case 'completed': return '已完成';
      case 'cancelled': return '已取消';
      default: return status??'--';
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(_data?['title']?.toString()??'报修详情')),
      body: _loading
        ? const AppLoadingSkeleton()
        : _error != null
          ? AppErrorCard(message: _error!, onRetry: _load)
          : _data == null
            ? const AppEmptyState(icon: Icons.build_off, title: "未找到报修单")
            : ListView(padding: const EdgeInsets.all(20), children: [
                Row(children: [
                  Text(_data!['title']?.toString()??'', style: Theme.of(context).textTheme.titleLarge),
                  const Spacer(),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                    decoration: BoxDecoration(color: _statusColor(_data!['status']?.toString()).withOpacity(0.1), borderRadius: BorderRadius.circular(12)),
                    child: Text(_statusLabel(_data!['status']?.toString()), style: TextStyle(color: _statusColor(_data!['status']?.toString()))),
                  ),
                ]),
                const SizedBox(height: 16),
                if (_data!['urgency'] != null)
                  Row(children: [
                    const Icon(Icons.warning_amber, size: 18, color: Colors.red),
                    const SizedBox(width: 4),
                    Text('紧急程度：${_data!['urgency']}', style: const TextStyle(color: Colors.red)),
                  ]),
                const SizedBox(height: 16),
                const Text('描述', style: TextStyle(fontWeight: FontWeight.bold)),
                const SizedBox(height: 8),
                Text(_data!['description']?.toString()??'暂无描述'),
                if (_data!['images'] != null && (_data!['images'] as List).isNotEmpty) ...[
                  const SizedBox(height: 16),
                  const Text('图片', style: TextStyle(fontWeight: FontWeight.bold)),
                  const SizedBox(height: 8),
                  SizedBox(
                    height: 200,
                    child: ListView.separated(
                      scrollDirection: Axis.horizontal,
                      itemCount: (_data!['images'] as List).length,
                      separatorBuilder: (_, __) => const SizedBox(width: 8),
                      itemBuilder: (_, i) => ClipRRect(
                        borderRadius: BorderRadius.circular(8),
                        child: Image.network((_data!['images'] as List)[i].toString(), width: 200, height: 200, fit: BoxFit.cover, errorBuilder: (_, __, ___) => Container(width: 200, color: Colors.grey[300])),
                      ),
                    ),
                  ),
                ],
              ]),
    );
  }
}
