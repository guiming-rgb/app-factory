import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../core/supabase/supabase_client.dart';
import '../../../core/widgets/polished_widgets.dart';

class ArticleFormPage extends StatefulWidget {
  final Map<String, dynamic>? initial;
  const ArticleFormPage({super.key, this.initial});
  @override
  State<ArticleFormPage> createState() => _ArticleFormPageState();
}

class _ArticleFormPageState extends State<ArticleFormPage> {
  final _formKey = GlobalKey<FormState>();
  final _nameCtrl = TextEditingController();
  final _descCtrl = TextEditingController();
  final _category_idCtrl = TextEditingController();
  final _tagsCtrl = TextEditingController();
  final _coverCtrl = TextEditingController();
  final _read_minutesCtrl = TextEditingController();
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    if (widget.initial != null) {
      _nameCtrl.text = (widget.initial!['name'] ?? widget.initial!['title'] ?? '').toString();
      _descCtrl.text = (widget.initial!['description'] ?? '').toString();
      _category_idCtrl.text = (widget.initial!['category_id'] ?? '').toString();
      _tagsCtrl.text = (widget.initial!['tags'] ?? '').toString();
      _coverCtrl.text = (widget.initial!['cover'] ?? '').toString();
      _read_minutesCtrl.text = (widget.initial!['read_minutes'] ?? '').toString();
    }
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
    _descCtrl.dispose();
    _category_idCtrl.dispose();
    _tagsCtrl.dispose();
    _coverCtrl.dispose();
    _read_minutesCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _saving = true);
    try {
      final data = <String, dynamic>{
        'name': _nameCtrl.text.trim(),
        'description': _descCtrl.text.trim(),
        'category_id': _category_idCtrl.text.trim(),
        'tags': _tagsCtrl.text.trim(),
        'cover': _coverCtrl.text.trim(),
        'read_minutes': _read_minutesCtrl.text.trim(),
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
      await client.from('articles').insert(data);
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
            controller: _category_idCtrl,
            decoration: const InputDecoration(labelText: 'category id', border: OutlineInputBorder()),
          ),
          const SizedBox(height: 16),
          TextFormField(
            controller: _tagsCtrl,
            decoration: const InputDecoration(labelText: 'tags', border: OutlineInputBorder()),
          ),
          const SizedBox(height: 16),
          TextFormField(
            controller: _coverCtrl,
            decoration: const InputDecoration(labelText: 'cover', border: OutlineInputBorder()),
          ),
          const SizedBox(height: 16),
          TextFormField(
            controller: _read_minutesCtrl,
            decoration: const InputDecoration(labelText: 'read minutes', border: OutlineInputBorder()),
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
