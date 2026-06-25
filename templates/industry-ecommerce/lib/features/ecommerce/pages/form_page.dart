import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../core/supabase/supabase_client.dart';
import '../../../core/widgets/polished_widgets.dart';

class ProductFormPage extends StatefulWidget {
  final Map<String, dynamic>? initial;
  const ProductFormPage({super.key, this.initial});
  @override
  State<ProductFormPage> createState() => _ProductFormPageState();
}

class _ProductFormPageState extends State<ProductFormPage> {
  final _formKey = GlobalKey<FormState>();
  final _nameCtrl = TextEditingController();
  final _priceCtrl = TextEditingController();
  final _descCtrl = TextEditingController();
  final _categoryCtrl = TextEditingController();
  final _stockCtrl = TextEditingController();
  final _imageCtrl = TextEditingController();
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    if (widget.initial != null) {
      _nameCtrl.text = (widget.initial!['name']??'').toString();
      _priceCtrl.text = (widget.initial!['price']??'').toString();
      _descCtrl.text = (widget.initial!['description']??'').toString();
      _categoryCtrl.text = (widget.initial!['category']??'').toString();
      _stockCtrl.text = (widget.initial!['stock']??'').toString();
      _imageCtrl.text = (widget.initial!['image_url']??'').toString();
    }
  }
  @override
  void dispose() { _nameCtrl.dispose(); _priceCtrl.dispose(); _descCtrl.dispose(); _categoryCtrl.dispose(); _stockCtrl.dispose(); _imageCtrl.dispose(); super.dispose(); }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _saving = true);
    try {
      final client = supabaseOrNull;
      if (client == null) {
        if (mounted) { ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('演示模式 — 数据未保存到服务器'))); Navigator.pop(context, true); }
        return;
      }
      await client.from("products").insert({
        'user_id': client.auth.currentUser!.id,
        'name': _nameCtrl.text, 'price': double.tryParse(_priceCtrl.text),
        'description': _descCtrl.text, 'category': _categoryCtrl.text,
        'stock': int.tryParse(_stockCtrl.text), 'image_url': _imageCtrl.text,
      });
      if (mounted) { ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('保存成功'))); Navigator.pop(context, true); }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('保存失败: $e')));
    } finally { if (mounted) setState(() => _saving = false); }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(widget.initial != null ? '编辑' : '添加商品')),
      body: Form(key: _formKey, child: ListView(padding: const EdgeInsets.all(20), children: [
        TextFormField(controller: _nameCtrl, decoration: const InputDecoration(labelText: '商品名称', border: OutlineInputBorder()), validator: (v) => v?.isEmpty == true ? '请输入商品名称' : null),
        const SizedBox(height: 16),
        TextFormField(controller: _priceCtrl, decoration: const InputDecoration(labelText: '价格', border: OutlineInputBorder(), prefixText: '¥'), keyboardType: TextInputType.number, validator: (v) {
          if (v == null || v.isEmpty) return '请输入价格';
          if (double.tryParse(v) == null) return '请输入有效数字';
          return null;
        }),
        const SizedBox(height: 16),
        TextFormField(controller: _stockCtrl, decoration: const InputDecoration(labelText: '库存', border: OutlineInputBorder()), keyboardType: TextInputType.number, validator: (v) {
          if (v == null || v.isEmpty) return null;
          if (int.tryParse(v) == null) return '请输入有效整数';
          return null;
        }),
        const SizedBox(height: 16),
        TextFormField(controller: _categoryCtrl, decoration: const InputDecoration(labelText: '分类', border: OutlineInputBorder(), hintText: '如：电子产品、服装')),
        const SizedBox(height: 16),
        TextFormField(controller: _imageCtrl, decoration: const InputDecoration(labelText: '图片链接', border: OutlineInputBorder())),
        const SizedBox(height: 16),
        TextFormField(controller: _descCtrl, decoration: const InputDecoration(labelText: '描述', border: OutlineInputBorder()), maxLines: 4),
        const SizedBox(height: 24),
        SizedBox(height: 48, child: ElevatedButton(onPressed: _saving ? null : _submit, child: Text(_saving ? '保存中...' : '保存'))),
      ])),
    );
  }
}
