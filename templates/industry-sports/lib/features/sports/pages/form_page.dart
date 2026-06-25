import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../core/supabase/supabase_client.dart';
import '../../../core/widgets/polished_widgets.dart';

class MatchFormPage extends StatefulWidget {
  final Map<String, dynamic>? initial;
  const MatchFormPage({super.key, this.initial});
  @override
  State<MatchFormPage> createState() => _MatchFormPageState();
}

class _MatchFormPageState extends State<MatchFormPage> {
  final _formKey = GlobalKey<FormState>();
  final _nameCtrl = TextEditingController();
  final _descCtrl = TextEditingController();
  final _home_team_idCtrl = TextEditingController();
  final _away_team_idCtrl = TextEditingController();
  final _home_scoreCtrl = TextEditingController();
  final _away_scoreCtrl = TextEditingController();
  final _venueCtrl = TextEditingController();
  final _dateCtrl = TextEditingController();
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    if (widget.initial != null) {
      _nameCtrl.text = (widget.initial!['name'] ?? widget.initial!['title'] ?? '').toString();
      _descCtrl.text = (widget.initial!['description'] ?? '').toString();
      _home_team_idCtrl.text = (widget.initial!['home_team_id'] ?? '').toString();
      _away_team_idCtrl.text = (widget.initial!['away_team_id'] ?? '').toString();
      _home_scoreCtrl.text = (widget.initial!['home_score'] ?? '').toString();
      _away_scoreCtrl.text = (widget.initial!['away_score'] ?? '').toString();
      _venueCtrl.text = (widget.initial!['venue'] ?? '').toString();
      _dateCtrl.text = (widget.initial!['date'] ?? '').toString();
    }
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
    _descCtrl.dispose();
    _home_team_idCtrl.dispose();
    _away_team_idCtrl.dispose();
    _home_scoreCtrl.dispose();
    _away_scoreCtrl.dispose();
    _venueCtrl.dispose();
    _dateCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _saving = true);
    try {
      final data = <String, dynamic>{
        'name': _nameCtrl.text.trim(),
        'description': _descCtrl.text.trim(),
        'home_team_id': _home_team_idCtrl.text.trim(),
        'away_team_id': _away_team_idCtrl.text.trim(),
        'home_score': _home_scoreCtrl.text.trim(),
        'away_score': _away_scoreCtrl.text.trim(),
        'venue': _venueCtrl.text.trim(),
        'date': _dateCtrl.text.trim(),
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
      await client.from('matches').insert(data);
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
            controller: _home_team_idCtrl,
            decoration: const InputDecoration(labelText: 'home team id', border: OutlineInputBorder()),
          ),
          const SizedBox(height: 16),
          TextFormField(
            controller: _away_team_idCtrl,
            decoration: const InputDecoration(labelText: 'away team id', border: OutlineInputBorder()),
          ),
          const SizedBox(height: 16),
          TextFormField(
            controller: _home_scoreCtrl,
            decoration: const InputDecoration(labelText: 'home score', border: OutlineInputBorder()),
          ),
          const SizedBox(height: 16),
          TextFormField(
            controller: _away_scoreCtrl,
            decoration: const InputDecoration(labelText: 'away score', border: OutlineInputBorder()),
          ),
          const SizedBox(height: 16),
          TextFormField(
            controller: _venueCtrl,
            decoration: const InputDecoration(labelText: 'venue', border: OutlineInputBorder()),
          ),
          const SizedBox(height: 16),
          TextFormField(
            controller: _dateCtrl,
            decoration: const InputDecoration(labelText: 'date', border: OutlineInputBorder()),
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
