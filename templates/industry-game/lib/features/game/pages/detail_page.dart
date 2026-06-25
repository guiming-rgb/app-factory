import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../core/theme/app_theme.dart';
import '../services/game_service.dart';
import '../../../core/supabase/supabase_client.dart';

class GameScoreDetailPage extends StatefulWidget {
  final String itemId;
  const GameScoreDetailPage({super.key, required this.itemId});
  @override
  State<GameScoreDetailPage> createState() => _GameScoreDetailPageState();
}

class _GameScoreDetailPageState extends State<GameScoreDetailPage> {
  Map<String, dynamic>? _item;
  bool _loading = true;
  String? _error;
  bool _supabaseAvailable = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() { _loading = true; _error = null; });
    try {
      final client = supabaseOrNull;
      if (client == null) {
        setState(() { _item = _sampleData(); _loading = false; _supabaseAvailable = false; });
        return;
      }
      final result = await client
          .from("game_scores")
          .select("*")
          .eq("id", widget.itemId)
          .maybeSingle();
      setState(() { _item = result as Map<String, dynamic>?; _loading = false; });
    } catch (e) {
      setState(() { _error = e.toString(); _loading = false; });
    }
  }

  Map<String, dynamic> _sampleData() {
    return {
      'id': 'demo-1',
      'name': '王者荣耀',
      'genre': 'MOBA',
      'rating': 4.5,
      'player_count': 100000000,
      'description': '《王者荣耀》是一款多人在线战术竞技游戏（MOBA），'
          '玩家将扮演召唤师，选择英雄在王者峡谷中展开 5v5 对战。'
          '游戏拥有超过 120 位英雄，涵盖战士、法师、射手、刺客、坦克、辅助六大职业。\n\n'
          '• 5v5 经典对战模式\n'
          '• 排位赛竞技体系\n'
          '• 大乱斗娱乐模式\n'
          '• 丰富的英雄和皮肤系统\n'
          '• 实时语音沟通',
      'icon': 'https://picsum.photos/seed/game1/200/200',
      'publisher': '腾讯游戏',
      'platforms': ['iOS', 'Android'],
      'release_date': '2015-11-26',
      'created_at': '2026-01-01T00:00:00Z',
    };
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      appBar: AppBar(title: Text(_item?['name'] ?? _item?['title'] ?? '游戏详情')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                  const Icon(Icons.error_outline, size: 48, color: Colors.red),
                  const SizedBox(height: 12),
                  const Text('加载失败', style: TextStyle(fontSize: 16)),
                  const SizedBox(height: 8),
                  Text(_error!, style: AppTheme.caption(theme.textTheme)),
                  const SizedBox(height: 16),
                  ElevatedButton.icon(
                    onPressed: _load,
                    icon: const Icon(Icons.refresh),
                    label: const Text('重试'),
                  ),
                ]))
              : _item == null
                  ? const Center(child: Text('未找到'))
                  : ListView(padding: const EdgeInsets.all(16), children: [
                      if (!_supabaseAvailable)
                        Container(
                          padding: const EdgeInsets.all(12),
                          margin: const EdgeInsets.only(bottom: 12),
                          decoration: BoxDecoration(
                            color: Colors.orange.shade50,
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: const Row(children: [
                            Icon(Icons.info_outline, size: 16, color: Colors.orange),
                            SizedBox(width: 8),
                            Expanded(
                              child: Text('演示模式 — 配置 Supabase 后显示真实数据',
                                  style: TextStyle(fontSize: 12)),
                            ),
                          ]),
                        ),
                      ..._buildFields(),
                    ]),
    );
  }

  List<Widget> _buildFields() {
    final item = _item!;
    final theme = Theme.of(context);
    final list = <Widget>[];

    // Icon + Name row
    list.add(Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
      if (item['icon'] != null && item['icon'].toString().isNotEmpty)
        ClipRRect(
          borderRadius: BorderRadius.circular(16),
          child: Image.network(
            item['icon'].toString(),
            width: 80,
            height: 80,
            fit: BoxFit.cover,
            errorBuilder: (_, __, ___) => Container(
              width: 80,
              height: 80,
              decoration: BoxDecoration(
                color: Colors.purple.shade100,
                borderRadius: BorderRadius.circular(16),
              ),
              child: const Icon(Icons.sports_esports, size: 40, color: Colors.purple),
            ),
          ),
        ),
      if (item['icon'] != null) const SizedBox(width: 16),
      Expanded(
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(
            item['name'] ?? '',
            style: theme.textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 4),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
            decoration: BoxDecoration(
              color: Colors.purple.shade50,
              borderRadius: BorderRadius.circular(6),
            ),
            child: Text(
              item['genre']?.toString() ?? '',
              style: TextStyle(fontSize: 12, color: Colors.purple.shade600, fontWeight: FontWeight.w600),
            ),
          ),
          const SizedBox(height: 6),
          // Rating stars
          Row(children: [
            ...List.generate(5, (i) => Icon(
              item['rating'] != null && (item['rating'] as num) > i ? Icons.star : Icons.star_border,
              size: 14,
              color: Colors.amber,
            )),
            const SizedBox(width: 4),
            Text(item['rating']?.toString() ?? '', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
          ]),
        ]),
      ),
    ]));
    list.add(const SizedBox(height: 16));

    // Player count
    if (item['player_count'] != null) {
      list.add(_statCard(
        icon: Icons.people,
        label: '玩家人数',
        value: _formatPlayerCount((item['player_count'] as num).toDouble()),
      ));
      list.add(const SizedBox(height: 12));
    }

    // Publisher
    if (item['publisher'] != null) {
      list.add(_infoRow(Icons.business, '发行商', item['publisher'].toString()));
    }

    // Platforms
    if (item['platforms'] != null) {
      final platforms = item['platforms'];
      if (platforms is List && platforms.isNotEmpty) {
        list.add(_infoRow(Icons.devices, '平台', platforms.join(' / ')));
      }
    }

    // Release date
    if (item['release_date'] != null) {
      list.add(_infoRow(Icons.calendar_today, '发行日期', item['release_date'].toString()));
    }

    // Description
    if (item['description'] != null && item['description'].toString().isNotEmpty) {
      list.add(const SizedBox(height: 12));
      list.add(Text('游戏介绍', style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600)));
      list.add(const SizedBox(height: 6));
      list.add(Text(item['description'].toString(), style: AppTheme.bodyText(theme.textTheme)));
    }

    return list;
  }

  Widget _statCard({required IconData icon, required String label, required String value}) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [Colors.purple.shade50, Colors.deepPurple.shade50],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(children: [
        Icon(icon, size: 28, color: Colors.purple.shade400),
        const SizedBox(width: 12),
        Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(label, style: TextStyle(fontSize: 12, color: Colors.grey.shade600)),
          Text(value, style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Colors.purple.shade700)),
        ]),
      ]),
    );
  }

  Widget _infoRow(IconData icon, String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(children: [
        Icon(icon, size: 18, color: Colors.grey.shade600),
        const SizedBox(width: 8),
        SizedBox(width: 64, child: Text(label, style: TextStyle(fontSize: 13, color: Colors.grey.shade600))),
        Expanded(child: Text(value, style: const TextStyle(fontSize: 14))),
      ]),
    );
  }

  String _formatPlayerCount(double n) {
    if (n >= 100000000) return '${(n / 100000000).toStringAsFixed(1)}亿';
    if (n >= 10000) return '${(n / 10000).toStringAsFixed(0)}万';
    return n.toStringAsFixed(0);
  }
}
