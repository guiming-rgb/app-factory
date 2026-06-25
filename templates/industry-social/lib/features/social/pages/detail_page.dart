import 'package:flutter/material.dart';
import '../../../core/supabase/supabase_client.dart';
import '../../../core/widgets/polished_widgets.dart';
import '../services/social_service.dart';

class PostDetailPage extends StatefulWidget {
  final Map<String, dynamic> item;
  const PostDetailPage({super.key, required this.item});
  @override
  State<PostDetailPage> createState() => _PostDetailPageState();
}

class _PostDetailPageState extends State<PostDetailPage> {
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
        final service = SocialService(client);
        final id = widget.item['id'];
        if (id != null) {
          try {
            final feed = await service.getFeed();
            if (feed.isNotEmpty) {
              _data = feed.first;
              if (mounted) { setState(() { _loading = false; }); return; }
            }
          } catch (_) {}
        }
        _data = widget.item;
      } else {
        _data = {
          'content': '今天去了颐和园，秋天的风景真的太美了！分享几张随手拍的照片给大家。\n大家周末都去哪里玩呀？',
          'images': ['https://picsum.photos/seed/post1/400/300', 'https://picsum.photos/seed/post2/400/300', 'https://picsum.photos/seed/post3/400/300'],
          'topic': '周末生活',
          'likes': 256,
          'comments': 48,
          'shares': 12,
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
      appBar: AppBar(title: const Text('帖子详情')),
      body: _loading
        ? const AppLoadingSkeleton()
        : _error != null
          ? AppErrorCard(message: _error!, onRetry: _load)
          : _data == null
            ? const AppEmptyState(icon: Icons.article, title: "未找到帖子")
            : ListView(padding: const EdgeInsets.all(20), children: [
                Text(_data!['content']?.toString()??'', style: Theme.of(context).textTheme.bodyLarge),
                if (_data!['images'] != null && (_data!['images'] as List).isNotEmpty) ...[
                  const SizedBox(height: 16),
                  _buildImageGrid(_data!['images'] as List),
                ],
                if (_data!['topic'] != null) ...[
                  const SizedBox(height: 12),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    decoration: BoxDecoration(color: Theme.of(context).primaryColor.withOpacity(0.1), borderRadius: BorderRadius.circular(16)),
                    child: Text('#${_data!['topic']}', style: TextStyle(color: Theme.of(context).primaryColor)),
                  ),
                ],
                const Divider(height: 32),
                Row(children: [
                  _statItem(context, Icons.favorite_border, '${_data!['likes']??0}'),
                  const SizedBox(width: 24),
                  _statItem(context, Icons.chat_bubble_outline, '${_data!['comments']??0}'),
                  const SizedBox(width: 24),
                  _statItem(context, Icons.share_outlined, '${_data!['shares']??0}'),
                ]),
              ]),
    );
  }

  Widget _buildImageGrid(List images) {
    if (images.length == 1) {
      return ClipRRect(borderRadius: BorderRadius.circular(8), child: Image.network(images[0].toString(), fit: BoxFit.cover, errorBuilder: (_, __, ___) => Container(height: 200, color: Colors.grey[300])));
    }
    return Wrap(
      spacing: 4,
      runSpacing: 4,
      children: images.take(9).map((img) => SizedBox(
        width: (MediaQuery.of(context).size.width - 44) / (images.length < 4 ? images.length : 3),
        child: AspectRatio(aspectRatio: 1, child: ClipRRect(borderRadius: BorderRadius.circular(4), child: Image.network(img.toString(), fit: BoxFit.cover, errorBuilder: (_, __, ___) => Container(color: Colors.grey[300])))),
      )).toList(),
    );
  }

  Widget _statItem(BuildContext context, IconData icon, String count) {
    return Row(children: [
      Icon(icon, size: 20, color: Colors.grey),
      const SizedBox(width: 4),
      Text(count, style: Theme.of(context).textTheme.bodyMedium),
    ]);
  }
}
