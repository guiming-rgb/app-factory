import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../core/supabase/supabase_client.dart';
import '../../../core/widgets/polished_widgets.dart';

class CourseFormPage extends StatefulWidget {
  final Map<String, dynamic>? initial;
  const CourseFormPage({super.key, this.initial});
  @override
  State<CourseFormPage> createState() => _CourseFormPageState();
}

class _CourseFormPageState extends State<CourseFormPage> {
  final _formKey = GlobalKey<FormState>();
  final _titleCtrl = TextEditingController();
  final _descCtrl = TextEditingController();
  final _priceCtrl = TextEditingController();
  final _categoryCtrl = TextEditingController();
  final _durationCtrl = TextEditingController();
  final _levelCtrl = TextEditingController();
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    if (widget.initial != null) {
      _titleCtrl.text = (widget.initial!['title']??'').toString();
      _descCtrl.text = (widget.initial!['description']??'').toString();
      _priceCtrl.text = (widget.initial!['price']??'').toString();
      _categoryCtrl.text = (widget.initial!['category']??'').toString();
      _durationCtrl.text = (widget.initial!['duration']??'').toString();
      _levelCtrl.text = (widget.initial!['level']??'').toString();
    }
  }
  @override
  void dispose() { _titleCtrl.dispose(); _descCtrl.dispose(); _priceCtrl.dispose(); _categoryCtrl.dispose(); _durationCtrl.dispose(); _levelCtrl.dispose(); super.dispose(); }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _saving = true);
    try {
      final client = supabaseOrNull;
      if (client == null) {
        if (mounted) { ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('演示模式 — 数据未保存到服务器'))); Navigator.pop(context, true); }
        return;
      }
      await client.from("courses").insert({
        'user_id': client.auth.currentUser!.id,
        'title': _titleCtrl.text, 'description': _descCtrl.text, 'price': double.tryParse(_priceCtrl.text),
        'category': _categoryCtrl.text, 'duration': _durationCtrl.text, 'level': _levelCtrl.text,
      });
      if (mounted) { ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('保存成功'))); Navigator.pop(context, true); }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('保存失败: $e')));
    } finally { if (mounted) setState(() => _saving = false); }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(widget.initial != null ? '编辑' : '添加课程')),
      body: Form(key: _formKey, child: ListView(padding: const EdgeInsets.all(20), children: [
        TextFormField(controller: _titleCtrl, decoration: const InputDecoration(labelText: '课程名称', border: OutlineInputBorder()), validator: (v) => v?.isEmpty == true ? '请输入课程名称' : null),
        const SizedBox(height: 16),
        TextFormField(controller: _priceCtrl, decoration: const InputDecoration(labelText: '价格', border: OutlineInputBorder(), prefixText: '¥'), keyboardType: TextInputType.number, validator: (v) {
          if (v == null || v.isEmpty) return null;
          if (double.tryParse(v) == null) return '请输入有效数字';
          return null;
        }),
        const SizedBox(height: 16),
        TextFormField(controller: _categoryCtrl, decoration: const InputDecoration(labelText: '分类', border: OutlineInputBorder(), hintText: '如：编程、设计、外语')),
        const SizedBox(height: 16),
        TextFormField(controller: _levelCtrl, decoration: const InputDecoration(labelText: '难度', border: OutlineInputBorder(), hintText: '初级/中级/高级')),
        const SizedBox(height: 16),
        TextFormField(controller: _durationCtrl, decoration: const InputDecoration(labelText: '时长', border: OutlineInputBorder(), hintText: '如：12周、48课时')),
        const SizedBox(height: 16),
        TextFormField(controller: _descCtrl, decoration: const InputDecoration(labelText: '课程介绍', border: OutlineInputBorder()), maxLines: 4),
        const SizedBox(height: 24),
        SizedBox(height: 48, child: ElevatedButton(onPressed: _saving ? null : _submit, child: Text(_saving ? '保存中...' : '保存'))),
      ])),
    );
  }
}
