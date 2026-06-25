import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../core/theme/app_theme.dart';
import '../services/crm_service.dart';
import '../../../core/supabase/supabase_client.dart';

class ContactDetailPage extends StatefulWidget {
  final String itemId;
  const ContactDetailPage({super.key, required this.itemId});
  @override
  State<ContactDetailPage> createState() => _ContactDetailPageState();
}

class _ContactDetailPageState extends State<ContactDetailPage> {
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
          .from("contacts")
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
      'name': '王建国',
      'company': '华创科技有限公司',
      'stage': '谈判',
      'deal_value': 158000,
      'phone': '138-8888-8888',
      'email': 'jianguo.wang@huachuang.cn',
      'source': '转介绍',
      'title': '技术总监',
      'notes': '对定制化方案有强烈需求，预算充足，预计本月内完成签约',
      'expected_close': '2026-07-15',
      'created_at': '2026-05-10T10:30:00Z',
    };
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      appBar: AppBar(title: Text(_item?['name'] ?? _item?['title'] ?? '客户详情')),
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

    // Name header
    list.add(Text(
      item['name']?.toString() ?? '',
      style: theme.textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.bold),
    ));
    list.add(const SizedBox(height: 4));

    // Company + title
    if (item['company'] != null || item['title'] != null) {
      list.add(Text(
        [item['company'], item['title']].whereType<String>().join(' · '),
        style: AppTheme.caption(theme.textTheme),
      ));
      list.add(const SizedBox(height: 16));
    }

    // Stage (color-coded)
    final stages = ['线索', '接触', '需求', '报价', '谈判', '成交', '丢失'];
    final stageColors = [0xFF3B82F6, 0xFF06B6D4, 0xFFF59E0B, 0xFFD97706, 0xFFDC2626, 0xFF10B981, 0xFF6B7280];
    final stageIdx = stages.indexOf(item['stage'] ?? '');
    final stageColor = stageIdx >= 0 ? Color(stageColors[stageIdx]) : Colors.grey;

    list.add(_infoTile(
      icon: Icons.flag,
      label: '销售阶段',
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
        decoration: BoxDecoration(
          color: stageColor.withValues(alpha: 0.15),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Text(
          item['stage']?.toString() ?? '',
          style: TextStyle(
            color: stageColor,
            fontWeight: FontWeight.w600,
            fontSize: 13,
          ),
        ),
      ),
    ));

    // Deal value
    final dealValue = item['deal_value'];
    if (dealValue != null) {
      list.add(_infoTile(
        icon: Icons.monetization_on,
        label: '商机金额',
        child: Text(
          '¥${_formatNumber((dealValue as num).toDouble())}',
          style: TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.bold,
            color: Colors.green.shade700,
          ),
        ),
      ));
    }

    // Phone
    if (item['phone'] != null && item['phone'].toString().isNotEmpty) {
      list.add(_infoTile(
        icon: Icons.phone,
        label: '电话',
        child: Text(item['phone'].toString(), style: AppTheme.bodyText(theme.textTheme)),
      ));
    }

    // Email
    if (item['email'] != null && item['email'].toString().isNotEmpty) {
      list.add(_infoTile(
        icon: Icons.email,
        label: '邮箱',
        child: Text(item['email'].toString(), style: AppTheme.bodyText(theme.textTheme)),
      ));
    }

    // Source
    if (item['source'] != null) {
      list.add(_infoTile(
        icon: Icons.source,
        label: '来源',
        child: Text(item['source'].toString(), style: AppTheme.bodyText(theme.textTheme)),
      ));
    }

    // Expected close
    if (item['expected_close'] != null) {
      list.add(_infoTile(
        icon: Icons.date_range,
        label: '预计成交',
        child: Text(_formatDate(item['expected_close'].toString()), style: AppTheme.bodyText(theme.textTheme)),
      ));
    }

    // Notes
    if (item['notes'] != null && item['notes'].toString().isNotEmpty) {
      list.add(const SizedBox(height: 8));
      list.add(Text('备注', style: AppTheme.caption(theme.textTheme)));
      list.add(const SizedBox(height: 4));
      list.add(Container(
        width: double.infinity,
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: Colors.grey.shade50,
          borderRadius: BorderRadius.circular(8),
        ),
        child: Text(item['notes'].toString(), style: AppTheme.bodyText(theme.textTheme)),
      ));
    }

    return list;
  }

  Widget _infoTile({required IconData icon, required String label, required Widget child}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(crossAxisAlignment: CrossAxisAlignment.center, children: [
        Icon(icon, size: 20, color: Colors.grey.shade600),
        const SizedBox(width: 10),
        SizedBox(width: 72, child: Text(label, style: TextStyle(fontSize: 13, color: Colors.grey.shade600))),
        const SizedBox(width: 8),
        Expanded(child: child),
      ]),
    );
  }

  String _formatNumber(double n) {
    if (n >= 10000) return '${(n / 10000).toStringAsFixed(1)}万';
    return n.toStringAsFixed(0);
  }

  String _formatDate(String iso) {
    try {
      final d = DateTime.parse(iso);
      return '${d.year}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';
    } catch (_) {
      return iso;
    }
  }
}
