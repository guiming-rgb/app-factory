import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../core/supabase/supabase_client.dart';
import '../../../core/widgets/polished_widgets.dart';

class ProfileFormPage extends StatefulWidget {
  final Map<String, dynamic>? initial;
  const ProfileFormPage({super.key, this.initial});
  @override
  State<ProfileFormPage> createState() => _ProfileFormPageState();
}

class _ProfileFormPageState extends State<ProfileFormPage> {
  final _formKey = GlobalKey<FormState>();
  final _nameCtrl = TextEditingController();
  final _descCtrl = TextEditingController();
  final _display_nameCtrl = TextEditingController();
  final _ageCtrl = TextEditingController();
  final _genderCtrl = TextEditingController();
  final _bioCtrl = TextEditingController();
  final _locationCtrl = TextEditingController();
  final _interestsCtrl = TextEditingController();
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    if (widget.initial != null) {
      _nameCtrl.text = (widget.initial!['name'] ?? widget.initial!['title'] ?? '').toString();
      _descCtrl.text = (widget.initial!['description'] ?? '').toString();
      _display_nameCtrl.text = (widget.initial!['display_name'] ?? '').toString();
      _ageCtrl.text = (widget.initial!['age'] ?? '').toString();
      _genderCtrl.text = (widget.initial!['gender'] ?? '').toString();
      _bioCtrl.text = (widget.initial!['bio'] ?? '').toString();
      _locationCtrl.text = (widget.initial!['location'] ?? '').toString();
      _interestsCtrl.text = (widget.initial!['interests'] ?? '').toString();
    }
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
    _descCtrl.dispose();
    _display_nameCtrl.dispose();
    _ageCtrl.dispose();
    _genderCtrl.dispose();
    _bioCtrl.dispose();
    _locationCtrl.dispose();
    _interestsCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _saving = true);
    try {
      final data = <String, dynamic>{
        'name': _nameCtrl.text.trim(),
        'description': _descCtrl.text.trim(),
        'display_name': _display_nameCtrl.text.trim(),
        'age': _ageCtrl.text.trim(),
        'gender': _genderCtrl.text.trim(),
        'bio': _bioCtrl.text.trim(),
        'location': _locationCtrl.text.trim(),
        'interests': _interestsCtrl.text.trim(),
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
      await client.from('user_profiles').insert(data);
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
            controller: _display_nameCtrl,
            decoration: const InputDecoration(labelText: 'display name', border: OutlineInputBorder()),
          ),
          const SizedBox(height: 16),
          TextFormField(
            controller: _ageCtrl,
            decoration: const InputDecoration(labelText: 'age', border: OutlineInputBorder()),
          ),
          const SizedBox(height: 16),
          TextFormField(
            controller: _genderCtrl,
            decoration: const InputDecoration(labelText: 'gender', border: OutlineInputBorder()),
          ),
          const SizedBox(height: 16),
          TextFormField(
            controller: _bioCtrl,
            decoration: const InputDecoration(labelText: 'bio', border: OutlineInputBorder()),
          ),
          const SizedBox(height: 16),
          TextFormField(
            controller: _locationCtrl,
            decoration: const InputDecoration(labelText: 'location', border: OutlineInputBorder()),
          ),
          const SizedBox(height: 16),
          TextFormField(
            controller: _interestsCtrl,
            decoration: const InputDecoration(labelText: 'interests', border: OutlineInputBorder()),
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
