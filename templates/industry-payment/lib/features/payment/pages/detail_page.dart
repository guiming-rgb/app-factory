import 'package:flutter/material.dart';
import '../../../core/supabase/supabase_client.dart';
import '../../../core/widgets/polished_widgets.dart';
import '../services/payment_service.dart';

class PaymentOrderDetailPage extends StatefulWidget {
  final Map<String, dynamic> item;
  const PaymentOrderDetailPage({super.key, required this.item});
  @override
  State<PaymentOrderDetailPage> createState() => _PaymentOrderDetailPageState();
}

class _PaymentOrderDetailPageState extends State<PaymentOrderDetailPage> {
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
          'amount': 299.00,
          'currency': 'CNY',
          'method': '微信支付',
          'status': 'paid',
          'description': '购买高级会员 - 年卡套餐'
        };
      }
    } catch (e) {
      _data = widget.item;
    }
    if (mounted) setState(() { _loading = false; });
  }

  Color _statusColor(String? status) {
    switch (status) {
      case 'paid': return Colors.green;
      case 'pending': return Colors.orange;
      case 'failed': return Colors.red;
      case 'refunded': return Colors.grey;
      default: return Colors.grey;
    }
  }

  String _statusLabel(String? status) {
    switch (status) {
      case 'paid': return '已支付';
      case 'pending': return '待支付';
      case 'failed': return '支付失败';
      case 'refunded': return '已退款';
      default: return status??'--';
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('订单详情')),
      body: _loading
        ? const AppLoadingSkeleton()
        : _error != null
          ? AppErrorCard(message: _error!, onRetry: _load)
          : _data == null
            ? const AppEmptyState(icon: Icons.receipt_long, title: "未找到订单")
            : ListView(padding: const EdgeInsets.all(20), children: [
                Card(child: Padding(
                  padding: const EdgeInsets.all(20),
                  child: Column(children: [
                    Text('¥${_data!['amount']?.toString()??'0.00'}', style: Theme.of(context).textTheme.headlineLarge?.copyWith(color: Theme.of(context).primaryColor, fontWeight: FontWeight.bold)),
                    const SizedBox(height: 12),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                      decoration: BoxDecoration(color: _statusColor(_data!['status']?.toString()).withOpacity(0.1), borderRadius: BorderRadius.circular(12)),
                      child: Text(_statusLabel(_data!['status']?.toString()), style: TextStyle(color: _statusColor(_data!['status']?.toString()))),
                    ),
                  ]),
                )),
                const SizedBox(height: 16),
                _infoRow(context, '货币', _data!['currency']?.toString()),
                _infoRow(context, '支付方式', _data!['method']?.toString()),
                _infoRow(context, '描述', _data!['description']?.toString()),
              ]),
    );
  }

  Widget _infoRow(BuildContext context, String label, String? value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        SizedBox(width: 100, child: Text('$label：', style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.grey))),
        Expanded(child: Text(value??'--')),
      ]),
    );
  }
}
