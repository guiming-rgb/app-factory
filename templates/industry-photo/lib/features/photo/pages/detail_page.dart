import 'package:flutter/material.dart';
import '../../../core/supabase/supabase_client.dart';
import '../../../core/widgets/polished_widgets.dart';
import '../services/photo_service.dart';

class PhotoItemDetailPage extends StatefulWidget {
  final Map<String, dynamic> item;
  const PhotoItemDetailPage({super.key, required this.item});
  @override
  State<PhotoItemDetailPage> createState() => _PhotoItemDetailPageState();
}

class _PhotoItemDetailPageState extends State<PhotoItemDetailPage> {
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
        _data = widget.item;
      } else {
        _data = {
          'image_url': 'https://picsum.photos/seed/photo1/800/600',
          'caption': '夕阳下的城市天际线，美不胜收',
          'filter': '暖阳',
          'location': '上海外滩',
          'tags': ['城市', '夕阳', '摄影'],
          'likes': 128,
          'comments': 32,
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
      appBar: AppBar(title: Text(_data?['caption']?.toString()??'照片详情')),
      body: _loading
        ? const AppLoadingSkeleton()
        : _error != null
          ? AppErrorCard(message: _error!, onRetry: _load)
          : _data == null
            ? const AppEmptyState(icon: Icons.image_not_supported, title: "未找到照片")
            : ListView(children: [
                _data!['image_url'] != null
                  ? Image.network(_data!['image_url'].toString(), height: 300, width: double.infinity, fit: BoxFit.cover, errorBuilder: (_, __, ___) => Container(height: 300, color: Colors.grey[300], child: const Center(child: Icon(Icons.broken_image, size: 64))))
                  : Container(height: 300, color: Colors.grey[300], child: const Center(child: Icon(Icons.image, size: 64, color: Colors.grey))),
                Padding(
                  padding: const EdgeInsets.all(20),
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text(_data!['caption']?.toString()??'', style: Theme.of(context).textTheme.titleMedium),
                    const SizedBox(height: 8),
                    if (_data!['filter'] != null) Text('滤镜：${_data!['filter']}', style: Theme.of(context).textTheme.bodySmall?.copyWith(color: Colors.grey)),
                    if (_data!['location'] != null) Padding(
                      padding: const EdgeInsets.only(top: 4),
                      child: Row(children: [const Icon(Icons.location_on, size: 16, color: Colors.grey), const SizedBox(width: 4), Text(_data!['location'].toString(), style: Theme.of(context).textTheme.bodySmall?.copyWith(color: Colors.grey))]),
                    ),
                    if (_data!['tags'] != null) Padding(
                      padding: const EdgeInsets.only(top: 12),
                      child: Wrap(spacing: 8, runSpacing: 4, children: ((_data!['tags'] as List?)??[]).map((t) => Chip(label: Text(t.toString(), style: const TextStyle(fontSize: 12)), materialTapTargetSize: MaterialTapTargetSize.shrinkWrap)).toList()),
                    ),
                    const SizedBox(height: 16),
                    Row(children: [
                      const Icon(Icons.favorite, color: Colors.red, size: 20),
                      const SizedBox(width: 4),
                      Text('${_data!['likes']??0}'),
                      const SizedBox(width: 24),
                      const Icon(Icons.chat_bubble_outline, size: 20),
                      const SizedBox(width: 4),
                      Text('${_data!['comments']??0}'),
                    ]),
                  ]),
                ),
              ]),
    );
  }
}
