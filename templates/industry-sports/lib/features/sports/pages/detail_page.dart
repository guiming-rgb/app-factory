import 'package:flutter/material.dart';
import '../../../core/supabase/supabase_client.dart';
import '../../../core/widgets/polished_widgets.dart';
import '../services/sports_service.dart';

class MatchItemDetailPage extends StatefulWidget {
  final Map<String, dynamic> item;
  const MatchItemDetailPage({super.key, required this.item});
  @override
  State<MatchItemDetailPage> createState() => _MatchItemDetailPageState();
}

class _MatchItemDetailPageState extends State<MatchItemDetailPage> {
  Map<String, dynamic>? _data;
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() { _loading = true; _error = null; });
    try {
      final client = supabaseOrNull;
      if (client != null) {
        final service = SportsService(client);
        final id = widget.item['id'];
        if (id != null) {
          try {
            final live = await service.getLiveMatches();
            if (live.isNotEmpty) {
              _data = live.first;
              if (mounted) { setState(() { _loading = false; }); return; }
            }
          } catch (_) {}
        }
        _data = widget.item;
      } else {
        _data = {
          'home_team': '广州恒大',
          'away_team': '上海上港',
          'home_score': 2,
          'away_score': 1,
          'status': 'live',
          'venue': '天河体育中心',
          'date': '2026-05-15 19:35',
        };
      }
    } catch (e) {
      _data = widget.item;
    }
    if (mounted) setState(() { _loading = false; });
  }

  Color _statusColor(String? status) {
    switch (status) {
      case 'live': return Colors.red;
      case 'finished': return Colors.grey;
      case 'upcoming': return Colors.blue;
      default: return Colors.grey;
    }
  }

  String _statusLabel(String? status) {
    switch (status) {
      case 'live': return '进行中';
      case 'finished': return '已结束';
      case 'upcoming': return '即将开始';
      default: return status??'--';
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('${_data?['home_team']??''} vs ${_data?['away_team']??''}')),
      body: _loading
        ? const AppLoadingSkeleton()
        : _error != null
          ? AppErrorCard(message: _error!, onRetry: _load)
          : _data == null
            ? const AppEmptyState(icon: Icons.sports_esports, title: "未找到赛事")
            : ListView(padding: const EdgeInsets.all(20), children: [
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(24),
                    child: Column(children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                        decoration: BoxDecoration(color: _statusColor(_data!['status']?.toString()).withOpacity(0.1), borderRadius: BorderRadius.circular(12)),
                        child: Text(_statusLabel(_data!['status']?.toString()), style: TextStyle(color: _statusColor(_data!['status']?.toString()))),
                      ),
                      const SizedBox(height: 24),
                      Row(mainAxisAlignment: MainAxisAlignment.center, children: [
                        Expanded(child: Text(_data!['home_team']?.toString()??'', textAlign: TextAlign.center, style: Theme.of(context).textTheme.titleLarge)),
                        Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 16),
                          child: Text('${_data!['home_score']??'-'} : ${_data!['away_score']??'-'}', style: Theme.of(context).textTheme.headlineMedium?.copyWith(fontWeight: FontWeight.bold)),
                        ),
                        Expanded(child: Text(_data!['away_team']?.toString()??'', textAlign: TextAlign.center, style: Theme.of(context).textTheme.titleLarge)),
                      ]),
                    ]),
                  ),
                ),
                const SizedBox(height: 16),
                _infoRow(context, Icons.stadium, '场馆', _data!['venue']?.toString()),
                _infoRow(context, Icons.calendar_today, '时间', _data!['date']?.toString()),
              ]),
    );
  }

  Widget _infoRow(BuildContext context, IconData icon, String label, String? value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(children: [
        Icon(icon, size: 20, color: Colors.grey),
        const SizedBox(width: 12),
        Text('$label：', style: const TextStyle(fontWeight: FontWeight.bold)),
        Expanded(child: Text(value??'--')),
      ]),
    );
  }
}
