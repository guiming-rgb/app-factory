import 'package:flutter/material.dart';
import '../../../core/supabase/supabase_client.dart';
import '../../../core/widgets/polished_widgets.dart';
import '../services/weather_service.dart';

class CityDetailPage extends StatefulWidget {
  final Map<String, dynamic> item;
  const CityDetailPage({super.key, required this.item});
  @override
  State<CityDetailPage> createState() => _CityDetailPageState();
}

class _CityDetailPageState extends State<CityDetailPage> {
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
        final service = WeatherService(client);
        final id = widget.item['id'];
        if (id != null) {
          try {
            final cities = await service.getFavoriteCities();
            if (cities.isNotEmpty) {
              _data = cities.first;
              if (mounted) { setState(() { _loading = false; }); return; }
            }
          } catch (_) {}
        }
        _data = widget.item;
      } else {
        _data = {
          'name': '北京',
          'country': '中国',
          'latitude': 39.9042,
          'longitude': 116.4074,
          'is_current': true,
        };
      }
    } catch (e) {
      _data = widget.item;
    }
    if (mounted) setState(() { _loading = false; });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(_data?['name']?.toString()??'城市详情')),
      body: _loading
        ? const AppLoadingSkeleton()
        : _error != null
          ? AppErrorCard(message: _error!, onRetry: _load)
          : _data == null
            ? const AppEmptyState(icon: Icons.location_off, title: "未找到城市")
            : ListView(padding: const EdgeInsets.all(20), children: [
                Center(
                  child: Column(children: [
                    Icon(Icons.location_city, size: 80, color: Theme.of(context).primaryColor),
                    const SizedBox(height: 16),
                    Text(_data!['name']?.toString()??'', style: Theme.of(context).textTheme.headlineMedium?.copyWith(fontWeight: FontWeight.bold)),
                    if (_data!['country'] != null) Text(_data!['country'].toString(), style: Theme.of(context).textTheme.bodyLarge?.copyWith(color: Colors.grey)),
                  ]),
                ),
                const SizedBox(height: 32),
                Card(child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(children: [
                    _coordRow(context, '纬度', _data!['latitude']?.toString()),
                    const Divider(),
                    _coordRow(context, '经度', _data!['longitude']?.toString()),
                    const Divider(),
                    Row(children: [
                      const Icon(Icons.my_location, size: 20, color: Colors.grey),
                      const SizedBox(width: 12),
                      const Text('当前位置', style: TextStyle(fontWeight: FontWeight.bold)),
                      const Spacer(),
                      Icon(_data!['is_current'] == true ? Icons.check_circle : Icons.radio_button_unchecked, color: _data!['is_current'] == true ? Colors.green : Colors.grey),
                    ]),
                  ]),
                )),
              ]),
    );
  }

  Widget _coordRow(BuildContext context, String label, String? value) {
    return Row(children: [
      Icon(Icons.pin_drop, size: 20, color: Colors.grey),
      const SizedBox(width: 12),
      Text('$label：', style: const TextStyle(fontWeight: FontWeight.bold)),
      Text(value??'--'),
    ]);
  }
}
