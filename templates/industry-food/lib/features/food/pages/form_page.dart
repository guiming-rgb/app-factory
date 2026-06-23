import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../core/theme/app_theme.dart';

class RestaurantFormPage extends StatefulWidget {
  final Map<String,dynamic>? initial;
  const RestaurantFormPage({super.key, this.initial});
  @override
  State<RestaurantFormPage> createState() => _RestaurantFormPageState();
}

class _RestaurantFormPageState extends State<RestaurantFormPage> {
  final _formKey = GlobalKey<FormState>();
  final _nameCtrl = TextEditingController();
  final _descCtrl = TextEditingController();
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    if (widget.initial != null) {
      _nameCtrl.text = (widget.initial!['name']??widget.initial!['title']??'').toString();
      _descCtrl.text = (widget.initial!['description']??'').toString();
    }
  }
  @override
  void dispose() { _nameCtrl.dispose(); _descCtrl.dispose(); super.dispose(); }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _saving = true);
    try {
      await Supabase.instance.client.from("restaurants").insert({
        'user_id': Supabase.instance.client.auth.currentUser!.id,
        'name': _nameCtrl.text, 'description': _descCtrl.text
      });
      if (mounted) Navigator.pop(context, true);
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
    }
    setState(() => _saving = false);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(widget.initial != null ? "编辑" : "添加")),
      body: Form(key: _formKey, child: ListView(padding: const EdgeInsets.all(20), children: [
        TextFormField(controller: _nameCtrl, decoration: const InputDecoration(labelText: "名称"), validator: (v) => v?.isEmpty == true ? '必填' : null),
        const SizedBox(height: 16),
        TextFormField(controller: _descCtrl, decoration: const InputDecoration(labelText: "描述"), maxLines: 3),
        const SizedBox(height: 24),
        ElevatedButton(onPressed: _saving ? null : _save, child: Text(_saving ? "保存中…" : "保存")),
      ])),
    );
  }
}
