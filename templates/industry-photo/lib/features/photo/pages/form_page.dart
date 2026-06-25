import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../core/supabase/supabase_client.dart';
import '../../../core/widgets/polished_widgets.dart';

class PhotoFormPage extends StatefulWidget {
  final Map<String, dynamic>? initial;
  const PhotoFormPage({super.key, this.initial});
  @override
  State<PhotoFormPage> createState() => _PhotoFormPageState();
}

class _PhotoFormPageState extends State<PhotoFormPage> {
  final _formKey = GlobalKey<FormState>();
  final _nameCtrl = TextEditingController();
  final _descCtrl = TextEditingController();
  final _image_urlCtrl = TextEditingController();
  final _captionCtrl = TextEditingController();
  final _filterCtrl = TextEditingController();
  final _locationCtrl = TextEditingController();
  final _tagsCtrl = TextEditingController();
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    if (widget.initial != null) {
      _nameCtrl.text = (widget.initial!['name'] ?? widget.initial!['title'] ?? '').toString();
      _descCtrl.text = (widget.initial!['description'] ?? '').toString();
      _image_urlCtrl.text = (widget.initial!['image_url'] ?? '').toString();
      _captionCtrl.text = (widget.initial!['caption'] ?? '').toString();
      _filterCtrl.text = (widget.initial!['filter'] ?? '').toString();
      _locationCtrl.text = (widget.initial!['location'] ?? '').toString();
      _tagsCtrl.text = (widget.initial!['tags'] ?? '').toString();
    }
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
    _descCtrl.dispose();
    _image_urlCtrl.dispose();
    _captionCtrl.dispose();
    _filterCtrl.dispose();
    _locationCtrl.dispose();
    _tagsCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _saving = true);
    try {
      final data = <String, dynamic>{
        'name': _nameCtrl.text.trim(),
        'description': _descCtrl.text.trim(),
        'image_url': _image_urlCtrl.text.trim(),
        'caption': _captionCtrl.text.trim(),
        'filter': _filterCtrl.text.trim(),
        'location': _locationCtrl.text.trim(),
        'tags': _tagsCtrl.text.trim(),
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
      await client.from('photos').insert(data);
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
            controller: _image_urlCtrl,
            decoration: const InputDecoration(labelText: 'image url', border: OutlineInputBorder()),
          ),
          const SizedBox(height: 16),
          TextFormField(
            controller: _captionCtrl,
            decoration: const InputDecoration(labelText: 'caption', border: OutlineInputBorder()),
          ),
          const SizedBox(height: 16),
          TextFormField(
            controller: _filterCtrl,
            decoration: const InputDecoration(labelText: 'filter', border: OutlineInputBorder()),
          ),
          const SizedBox(height: 16),
          TextFormField(
            controller: _locationCtrl,
            decoration: const InputDecoration(labelText: 'location', border: OutlineInputBorder()),
          ),
          const SizedBox(height: 16),
          TextFormField(
            controller: _tagsCtrl,
            decoration: const InputDecoration(labelText: 'tags', border: OutlineInputBorder()),
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
