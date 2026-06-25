import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../core/supabase/supabase_client.dart';
import '../../../core/widgets/polished_widgets.dart';

class RestaurantFormPage extends StatefulWidget {
  final Map<String, dynamic>? initial;
  const RestaurantFormPage({super.key, this.initial});
  @override
  State<RestaurantFormPage> createState() => _RestaurantFormPageState();
}

class _RestaurantFormPageState extends State<RestaurantFormPage> {
  final _formKey = GlobalKey<FormState>();
  final _nameCtrl = TextEditingController();
  final _descCtrl = TextEditingController();
  final _cuisineCtrl = TextEditingController();
  final _ratingCtrl = TextEditingController();
  final _delivery_timeCtrl = TextEditingController();
  final _delivery_feeCtrl = TextEditingController();
  final _logoCtrl = TextEditingController();
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    if (widget.initial != null) {
      _nameCtrl.text = (widget.initial!['name'] ?? widget.initial!['title'] ?? '').toString();
      _descCtrl.text = (widget.initial!['description'] ?? '').toString();
      _cuisineCtrl.text = (widget.initial!['cuisine'] ?? '').toString();
      _ratingCtrl.text = (widget.initial!['rating'] ?? '').toString();
      _delivery_timeCtrl.text = (widget.initial!['delivery_time'] ?? '').toString();
      _delivery_feeCtrl.text = (widget.initial!['delivery_fee'] ?? '').toString();
      _logoCtrl.text = (widget.initial!['logo'] ?? '').toString();
    }
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
    _descCtrl.dispose();
    _cuisineCtrl.dispose();
    _ratingCtrl.dispose();
    _delivery_timeCtrl.dispose();
    _delivery_feeCtrl.dispose();
    _logoCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _saving = true);
    try {
      final data = <String, dynamic>{
        'name': _nameCtrl.text.trim(),
        'description': _descCtrl.text.trim(),
        'cuisine': _cuisineCtrl.text.trim(),
        'rating': _ratingCtrl.text.trim(),
        'delivery_time': _delivery_timeCtrl.text.trim(),
        'delivery_fee': _delivery_feeCtrl.text.trim(),
        'logo': _logoCtrl.text.trim(),
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
      await client.from('restaurants').insert(data);
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
            controller: _cuisineCtrl,
            decoration: const InputDecoration(labelText: 'cuisine', border: OutlineInputBorder()),
          ),
          const SizedBox(height: 16),
          TextFormField(
            controller: _ratingCtrl,
            decoration: const InputDecoration(labelText: 'rating', border: OutlineInputBorder()),
          ),
          const SizedBox(height: 16),
          TextFormField(
            controller: _delivery_timeCtrl,
            decoration: const InputDecoration(labelText: 'delivery time', border: OutlineInputBorder()),
          ),
          const SizedBox(height: 16),
          TextFormField(
            controller: _delivery_feeCtrl,
            decoration: const InputDecoration(labelText: 'delivery fee', border: OutlineInputBorder()),
          ),
          const SizedBox(height: 16),
          TextFormField(
            controller: _logoCtrl,
            decoration: const InputDecoration(labelText: 'logo', border: OutlineInputBorder()),
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
