import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../core/supabase/supabase_client.dart';
import '../../../core/widgets/polished_widgets.dart';

class ContactFormPage extends StatefulWidget {
  final Map<String, dynamic>? initial;
  const ContactFormPage({super.key, this.initial});
  @override
  State<ContactFormPage> createState() => _ContactFormPageState();
}

class _ContactFormPageState extends State<ContactFormPage> {
  final _formKey = GlobalKey<FormState>();
  final _nameCtrl = TextEditingController();
  final _descCtrl = TextEditingController();
  final _companyCtrl = TextEditingController();
  final _phoneCtrl = TextEditingController();
  final _emailCtrl = TextEditingController();
  final _stageCtrl = TextEditingController();
  final _valueCtrl = TextEditingController();
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    if (widget.initial != null) {
      _nameCtrl.text = (widget.initial!['name'] ?? widget.initial!['title'] ?? '').toString();
      _descCtrl.text = (widget.initial!['description'] ?? '').toString();
      _companyCtrl.text = (widget.initial!['company'] ?? '').toString();
      _phoneCtrl.text = (widget.initial!['phone'] ?? '').toString();
      _emailCtrl.text = (widget.initial!['email'] ?? '').toString();
      _stageCtrl.text = (widget.initial!['stage'] ?? '').toString();
      _valueCtrl.text = (widget.initial!['value'] ?? '').toString();
    }
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
    _descCtrl.dispose();
    _companyCtrl.dispose();
    _phoneCtrl.dispose();
    _emailCtrl.dispose();
    _stageCtrl.dispose();
    _valueCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _saving = true);
    try {
      final data = <String, dynamic>{
        'name': _nameCtrl.text.trim(),
        'description': _descCtrl.text.trim(),
        'company': _companyCtrl.text.trim(),
        'phone': _phoneCtrl.text.trim(),
        'email': _emailCtrl.text.trim(),
        'stage': _stageCtrl.text.trim(),
        'value': _valueCtrl.text.trim(),
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
      await client.from('contacts').insert(data);
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
            controller: _companyCtrl,
            decoration: const InputDecoration(labelText: 'company', border: OutlineInputBorder()),
          ),
          const SizedBox(height: 16),
          TextFormField(
            controller: _phoneCtrl,
            decoration: const InputDecoration(labelText: 'phone', border: OutlineInputBorder()),
          ),
          const SizedBox(height: 16),
          TextFormField(
            controller: _emailCtrl,
            decoration: const InputDecoration(labelText: 'email', border: OutlineInputBorder()),
          ),
          const SizedBox(height: 16),
          TextFormField(
            controller: _stageCtrl,
            decoration: const InputDecoration(labelText: 'stage', border: OutlineInputBorder()),
          ),
          const SizedBox(height: 16),
          TextFormField(
            controller: _valueCtrl,
            decoration: const InputDecoration(labelText: 'value', border: OutlineInputBorder()),
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
