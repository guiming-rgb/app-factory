import 'package:flutter/material.dart';
import '../../../core/supabase/supabase_client.dart';
import '../../../core/widgets/polished_widgets.dart';
import '../services/video_service.dart';

class VideoItemDetailPage extends StatefulWidget {
  final Map<String, dynamic> item;
  const VideoItemDetailPage({super.key, required this.item});
  @override
  State<VideoItemDetailPage> createState() => _VideoItemDetailPageState();
}

class _VideoItemDetailPageState extends State<VideoItemDetailPage> {
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
        final service = VideoService(client);
        final id = widget.item['id'];
        if (id != null) {
          try {
            final videos = await service.getVideos();
            if (videos.isNotEmpty) {
              _data = videos.first;
              if (mounted) { setState(() { _loading = false; }); return; }
            }
          } catch (_) {}
        }
        _data = widget.item;
      } else {
        _data = {
          'title': 'Flutter 3.0 新特性详解',
          'thumbnail': 'https://picsum.photos/seed/video1/640/360',
          'duration': '15:30',
          'views': 28500,
          'rating': 4.7,
          'category': '编程开发',
          'description': '深入讲解 Flutter 3.0 带来的全新特性，包括 Material 3 支持、iOS 自适应布局、Web 性能优化等内容。适合有一定 Flutter 基础的开发者观看。',
          'url': 'https://example.com/videos/flutter3',
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
      appBar: AppBar(title: Text(_data?['title']?.toString()??'视频详情')),
      body: _loading
        ? const AppLoadingSkeleton()
        : _error != null
          ? AppErrorCard(message: _error!, onRetry: _load)
          : _data == null
            ? const AppEmptyState(icon: Icons.videocam_off, title: "未找到视频")
            : ListView(children: [
                Stack(children: [
                  _data!['thumbnail'] != null
                    ? Image.network(_data!['thumbnail'].toString(), height: 220, width: double.infinity, fit: BoxFit.cover, errorBuilder: (_, __, ___) => Container(height: 220, color: Colors.grey[900]))
                    : Container(height: 220, color: Colors.grey[900]),
                  Positioned(
                    right: 12, bottom: 12,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(color: Colors.black87, borderRadius: BorderRadius.circular(4)),
                      child: Text(_data!['duration']?.toString()??'', style: const TextStyle(color: Colors.white, fontSize: 12)),
                    ),
                  ),
                  Positioned(
                    left: 0, right: 0, top: 0, bottom: 0,
                    child: Center(child: Container(
                      width: 56, height: 56,
                      decoration: BoxDecoration(color: Colors.black54, shape: BoxShape.circle),
                      child: const Icon(Icons.play_arrow, color: Colors.white, size: 36),
                    )),
                  ),
                ]),
                Padding(
                  padding: const EdgeInsets.all(20),
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text(_data!['title']?.toString()??'', style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold)),
                    const SizedBox(height: 8),
                    Row(children: [
                      _chip(context, _data!['category']?.toString()??''),
                      const Spacer(),
                      Text('${_data!['views']??0} 次播放', style: Theme.of(context).textTheme.bodySmall),
                      const SizedBox(width: 16),
                      Row(children: [const Icon(Icons.star, size: 16, color: Colors.amber), Text(_data!['rating']?.toString()??'')]),
                    ]),
                    const Divider(height: 32),
                    const Text('简介', style: TextStyle(fontWeight: FontWeight.bold)),
                    const SizedBox(height: 8),
                    Text(_data!['description']?.toString()??'暂无简介'),
                  ]),
                ),
              ]),
    );
  }

  Widget _chip(BuildContext context, String text) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(color: Theme.of(context).primaryColor.withOpacity(0.1), borderRadius: BorderRadius.circular(12)),
      child: Text(text, style: TextStyle(fontSize: 12, color: Theme.of(context).primaryColor)),
    );
  }
}
