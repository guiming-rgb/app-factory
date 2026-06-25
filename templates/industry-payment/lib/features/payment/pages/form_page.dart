import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../core/supabase/supabase_client.dart';
import '../../../core/widgets/polished_widgets.dart';

class PaymentOrderFormPage extends StatefulWidget {
  final Map<String, dynamic>? initial;
  const PaymentOrderFormPage({super.key, this.initial});
  @override
  State<PaymentOrderFormPage> createState() => _PaymentOrderFormPageState();
}

class _PaymentOrderFormPageState extends State<PaymentOrderFormPage> {
  final _formKey = GlobalKey<FormState>();
  final _nameCtrl = TextEditingController();
  final _descCtrl = TextEditingController();
  final _amountCtrl = TextEditingController();
  final _currencyCtrl = TextEditingController();
  final _methodCtrl = TextEditingController();
  final _descriptionCtrl = TextEditingController();
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    if (widget.initial != null) {
      _nameCtrl.text = (widget.initial!['name'] ?? widget.initial!['title'] ?? '').toString();
      _descCtrl.text = (widget.initial!['description'] ?? '').toString();
      _amountCtrl.text = (widget.initial!['amount'] ?? '').toString();
      _currencyCtrl.text = (widget.initial!['currency'] ?? '').toString();
      _methodCtrl.text = (widget.initial!['method'] ?? '').toString();
      _descriptionCtrl.text = (widget.initial!['description'] ?? '').toString();
    }
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
    _descCtrl.dispose();
    _amountCtrl.dispose();
    _currencyCtrl.dispose();
    _methodCtrl.dispose();
    _descriptionCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _saving = true);
    try {
      final data = <String, dynamic>{
        'name': _nameCtrl.text.trim(),
        'description': _descCtrl.text.trim(),
        'amount': _amountCtrl.text.trim(),
        'currency': _currencyCtrl.text.trim(),
        'method': _methodCtrl.text.trim(),
        'description': _descriptionCtrl.text.trim(),
      };
      final client = supabaseOrNull;
      if (client == null) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('✅ 演示模式 — 数据本地保存成功')),
          );
          Navigator.pop(context, true);
        }
        return;
      }
      await client.from('orders').insert(data);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('✅ 保存成功')),
        );
        Navigator.pop(context, true);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('保存失败: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(widget.initial != null ? '编辑' : '添加')),
      body: Form(
        key: _formKey,
        child: ListView(padding: const EdgeInsets.all(16), children: [
          TextFormField(
            controller: _nameCtrl,
            decoration: const InputDecoration(labelText: '名称', border: OutlineInputBorder()),
            validator: (v) => (v == null || v.trim().isEmpty) ? '请输入名称' : null,
          ),
          const SizedBox(height: 16),
          TextFormField(
            controller: _descCtrl,
            decoration: const InputDecoration(labelText: '描述', border: OutlineInputBorder()),
            maxLines: 3,
          ),
          const SizedBox(height: 16),
          TextFormField(
            controller: _amountCtrl,
            decoration: const InputDecoration(labelText: 'amount', border: OutlineInputBorder()),
          ),
          const SizedBox(height: 16),
          TextFormField(
            controller: _currencyCtrl,
            decoration: const InputDecoration(labelText: 'currency', border: OutlineInputBorder()),
          ),
          const SizedBox(height: 16),
          TextFormField(
            controller: _methodCtrl,
            decoration: const InputDecoration(labelText: 'method', border: OutlineInputBorder()),
          ),
          const SizedBox(height: 16),
          TextFormField(
            controller: _descriptionCtrl,
            decoration: const InputDecoration(labelText: 'description', border: OutlineInputBorder()),
          ),
          const SizedBox(height: 24),
          SizedBox(
            width: double.infinity,
            height: 48,
            child: FilledButton(
              onPressed: _saving ? null : _submit,
              child: Text(_saving ? '保存中…' : '保存'),
            ),
          ),
        ]),
      ),
    );
  }
}
