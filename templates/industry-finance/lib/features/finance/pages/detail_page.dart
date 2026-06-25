import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../core/theme/app_theme.dart';
import '../services/finance_service.dart';
import '../../../core/supabase/supabase_client.dart';

class TransactionDetailPage extends StatefulWidget {
  final String itemId;
  const TransactionDetailPage({super.key, required this.itemId});
  @override
  State<TransactionDetailPage> createState() => _TransactionDetailPageState();
}

class _TransactionDetailPageState extends State<TransactionDetailPage> {
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
          .from("transactions")
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
      'title': '午餐 - 鼎泰丰',
      'amount': 186.00,
      'type': 'expense',
      'category': '餐饮',
      'note': '客户招待餐，可报销',
      'account_id': '现金',
      'created_at': '2026-06-24T12:30:00Z',
    };
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      appBar: AppBar(title: Text(_item?['title'] ?? _item?['name'] ?? '账单详情')),
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

    // Amount (colored red/green based on type)
    final isIncome = item['type'] == 'income';
    final amount = item['amount'];
    list.add(Center(
      child: Column(children: [
        Text(
          isIncome ? '+' : '-',
          style: TextStyle(
            fontSize: 32,
            fontWeight: FontWeight.w300,
            color: isIncome ? Colors.green.shade600 : Colors.red.shade600,
          ),
        ),
        Text(
          amount != null ? '¥${(amount as num).toStringAsFixed(2)}' : '',
          style: TextStyle(
            fontSize: 40,
            fontWeight: FontWeight.bold,
            color: isIncome ? Colors.green.shade600 : Colors.red.shade600,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          isIncome ? '收入' : '支出',
          style: TextStyle(fontSize: 13, color: isIncome ? Colors.green : Colors.red),
        ),
      ]),
    ));
    list.add(const SizedBox(height: 24));

    // Title
    list.add(_detailRow(
      icon: Icons.title,
      label: '标题',
      value: item['title']?.toString() ?? '',
    ));

    // Category with icon
    final categoryIcons = {
      '餐饮': Icons.restaurant,
      '交通': Icons.directions_car,
      '购物': Icons.shopping_bag,
      '娱乐': Icons.movie,
      '住房': Icons.home,
      '医疗': Icons.local_hospital,
      '教育': Icons.school,
      '工资': Icons.account_balance,
      '投资': Icons.trending_up,
      '其他': Icons.more_horiz,
    };
    final cat = item['category']?.toString() ?? '其他';
    list.add(_detailRow(
      icon: categoryIcons[cat] ?? Icons.more_horiz,
      label: '分类',
      value: cat,
    ));

    // Type
    list.add(_detailRow(
      icon: isIncome ? Icons.arrow_upward : Icons.arrow_downward,
      label: '类型',
      value: isIncome ? '收入' : '支出',
    ));

    // Note
    if (item['note'] != null && item['note'].toString().isNotEmpty) {
      list.add(_detailRow(
        icon: Icons.notes,
        label: '备注',
        value: item['note'].toString(),
      ));
    }

    // Date
    if (item['created_at'] != null) {
      list.add(_detailRow(
        icon: Icons.calendar_today,
        label: '日期',
        value: _formatDate(item['created_at'].toString()),
      ));
    }

    return list;
  }

  Widget _detailRow({required IconData icon, required String label, required String value}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 10),
      child: Row(children: [
        Icon(icon, size: 20, color: Colors.grey.shade600),
        const SizedBox(width: 10),
        SizedBox(width: 56, child: Text(label, style: TextStyle(fontSize: 13, color: Colors.grey.shade600))),
        Expanded(
          child: Text(value, style: const TextStyle(fontSize: 15)),
        ),
      ]),
    );
  }

  String _formatDate(String iso) {
    try {
      final d = DateTime.parse(iso);
      return '${d.year}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')} '
          '${d.hour.toString().padLeft(2, '0')}:${d.minute.toString().padLeft(2, '0')}';
    } catch (_) {
      return iso;
    }
  }
}
