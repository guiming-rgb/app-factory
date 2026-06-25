import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../core/supabase/supabase_client.dart';
import '../../../core/widgets/polished_widgets.dart';

class HotelFormPage extends StatefulWidget {
  final Map<String, dynamic>? initial;
  const HotelFormPage({super.key, this.initial});
  @override
  State<HotelFormPage> createState() => _HotelFormPageState();
}

class _HotelFormPageState extends State<HotelFormPage> {
  final _formKey = GlobalKey<FormState>();
  final _nameCtrl = TextEditingController();
  final _descCtrl = TextEditingController();
  final _cityCtrl = TextEditingController();
  final _addressCtrl = TextEditingController();
  final _starsCtrl = TextEditingController();
  final _ratingCtrl = TextEditingController();
  final _price_fromCtrl = TextEditingController();
  final _amenitiesCtrl = TextEditingController();
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    if (widget.initial != null) {
      _nameCtrl.text = (widget.initial!['name'] ?? widget.initial!['title'] ?? '').toString();
      _descCtrl.text = (widget.initial!['description'] ?? '').toString();
      _cityCtrl.text = (widget.initial!['city'] ?? '').toString();
      _addressCtrl.text = (widget.initial!['address'] ?? '').toString();
      _starsCtrl.text = (widget.initial!['stars'] ?? '').toString();
      _ratingCtrl.text = (widget.initial!['rating'] ?? '').toString();
      _price_fromCtrl.text = (widget.initial!['price_from'] ?? '').toString();
      _amenitiesCtrl.text = (widget.initial!['amenities'] ?? '').toString();
    }
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
    _descCtrl.dispose();
    _cityCtrl.dispose();
    _addressCtrl.dispose();
    _starsCtrl.dispose();
    _ratingCtrl.dispose();
    _price_fromCtrl.dispose();
    _amenitiesCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _saving = true);
    try {
      final data = <String, dynamic>{
        'name': _nameCtrl.text.trim(),
        'description': _descCtrl.text.trim(),
        'city': _cityCtrl.text.trim(),
        'address': _addressCtrl.text.trim(),
        'stars': _starsCtrl.text.trim(),
        'rating': _ratingCtrl.text.trim(),
        'price_from': _price_fromCtrl.text.trim(),
        'amenities': _amenitiesCtrl.text.trim(),
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
      await client.from('hotels').insert(data);
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
            controller: _cityCtrl,
            decoration: const InputDecoration(labelText: 'city', border: OutlineInputBorder()),
          ),
          const SizedBox(height: 16),
          TextFormField(
            controller: _addressCtrl,
            decoration: const InputDecoration(labelText: 'address', border: OutlineInputBorder()),
          ),
          const SizedBox(height: 16),
          TextFormField(
            controller: _starsCtrl,
            decoration: const InputDecoration(labelText: 'stars', border: OutlineInputBorder()),
          ),
          const SizedBox(height: 16),
          TextFormField(
            controller: _ratingCtrl,
            decoration: const InputDecoration(labelText: 'rating', border: OutlineInputBorder()),
          ),
          const SizedBox(height: 16),
          TextFormField(
            controller: _price_fromCtrl,
            decoration: const InputDecoration(labelText: 'price from', border: OutlineInputBorder()),
          ),
          const SizedBox(height: 16),
          TextFormField(
            controller: _amenitiesCtrl,
            decoration: const InputDecoration(labelText: 'amenities', border: OutlineInputBorder()),
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
