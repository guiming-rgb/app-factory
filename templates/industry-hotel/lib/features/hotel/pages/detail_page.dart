import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../core/theme/app_theme.dart';
import '../services/hotel_service.dart';
import '../../../core/supabase/supabase_client.dart';

class HotelDetailPage extends StatefulWidget {
  final String itemId;
  const HotelDetailPage({super.key, required this.itemId});
  @override
  State<HotelDetailPage> createState() => _HotelDetailPageState();
}

class _HotelDetailPageState extends State<HotelDetailPage> {
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
      final result = await HotelService(client).getHotel(widget.itemId);
      setState(() { _item = result; _loading = false; });
    } catch (e) {
      setState(() { _error = e.toString(); _loading = false; });
    }
  }

  Map<String, dynamic> _sampleData() {
    return {
      'id': 'demo-1',
      'name': '三亚海棠湾君悦酒店',
      'city': '三亚',
      'address': '海棠区海棠北路 68 号',
      'stars': 5,
      'rating': 4.8,
      'price_per_night': 1288.00,
      'images': [
        'https://picsum.photos/seed/hotel1/800/500',
        'https://picsum.photos/seed/hotel2/800/500',
        'https://picsum.photos/seed/hotel3/800/500',
        'https://picsum.photos/seed/hotel4/800/500',
      ],
      'amenities': '游泳池,健身房,SPA,餐厅,酒吧,儿童乐园,商务中心,停车场,免费WiFi,接机服务',
      'description': '三亚海棠湾君悦酒店坐落于国家海岸海棠湾核心地带，'
          '面朝大海，背靠热带雨林。酒店拥有 520 间豪华客房和套房，'
          '所有客房均配有私人阳台并可欣赏海景或园景。\n\n'
          '• 距三亚国际免税城步行 5 分钟\n'
          '• 距凤凰国际机场 40 分钟车程\n'
          '• 拥有 3 个户外泳池和 1 个室内恒温泳池\n'
          '• 多个餐厅提供中餐、西餐、日式料理',
      'created_at': '2026-01-01T00:00:00Z',
    };
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      appBar: AppBar(title: Text(_item?['name'] ?? _item?['title'] ?? '酒店详情')),
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

    // Images gallery
    if (item['images'] != null) {
      final images = item['images'];
      if (images is List && images.isNotEmpty) {
        list.add(SizedBox(
          height: 240,
          child: PageView.builder(
            itemCount: images.length,
            itemBuilder: (_, i) => Padding(
              padding: const EdgeInsets.symmetric(horizontal: 4),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(12),
                child: Image.network(
                  images[i].toString(),
                  fit: BoxFit.cover,
                  width: double.infinity,
                  errorBuilder: (_, __, ___) => Container(
                    color: Colors.grey.shade200,
                    child: const Center(child: Icon(Icons.broken_image, size: 48, color: Colors.grey)),
                  ),
                  loadingBuilder: (_, child, progress) =>
                      progress == null ? child : const Center(child: CircularProgressIndicator()),
                ),
              ),
            ),
          ),
        ));
        list.add(const SizedBox(height: 8));
        if (images.length > 1) {
          list.add(Center(
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: List.generate(images.length, (i) => Container(
                margin: const EdgeInsets.symmetric(horizontal: 3),
                width: 8,
                height: 8,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: i == 0 ? Colors.blue : Colors.grey.shade300,
                ),
              )),
            ),
          ));
        }
        list.add(const SizedBox(height: 16));
      }
    }

    // Name
    list.add(Text(
      item['name'] ?? '',
      style: theme.textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.bold),
    ));
    list.add(const SizedBox(height: 6));

    // Stars (star icons)
    final stars = item['stars'];
    if (stars != null) {
      list.add(Row(children: [
        ...List.generate((stars as num).toInt(), (i) => const Icon(Icons.star, size: 18, color: Colors.amber)),
        if ((stars as num) % 1 != 0) const Icon(Icons.star_half, size: 18, color: Colors.amber),
        const SizedBox(width: 8),
        Text('${stars} 星级', style: AppTheme.caption(theme.textTheme)),
      ]));
      list.add(const SizedBox(height: 6));
    }

    // Rating
    list.add(Row(children: [
      ...List.generate(5, (i) => Icon(
        item['rating'] != null && (item['rating'] as num) > i ? Icons.star : Icons.star_border,
        size: 14,
        color: Colors.amber,
      )),
      const SizedBox(width: 6),
      Text(
        item['rating']?.toString() ?? '',
        style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: Colors.amber.shade700),
      ),
    ]));
    list.add(const SizedBox(height: 6));

    // City + Address
    if (item['city'] != null) {
      list.add(Row(children: [
        const Icon(Icons.location_on, size: 16, color: Colors.grey),
        const SizedBox(width: 4),
        Expanded(
          child: Text(
            [item['city'], item['address']].whereType<String>().join(' · '),
            style: AppTheme.caption(theme.textTheme),
          ),
        ),
      ]));
      list.add(const SizedBox(height: 12));
    }

    // Price from
    if (item['price_per_night'] != null) {
      list.add(Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.blue.shade50,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Row(children: [
          Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text('每晚起价', style: TextStyle(fontSize: 12, color: Colors.grey.shade600)),
            Row(crossAxisAlignment: CrossAxisAlignment.end, children: [
              Text(
                '¥${(item['price_per_night'] as num).toStringAsFixed(0)}',
                style: TextStyle(fontSize: 28, fontWeight: FontWeight.bold, color: Colors.blue.shade700),
              ),
              const Padding(padding: EdgeInsets.only(bottom: 4), child: Text('/晚', style: TextStyle(fontSize: 12, color: Colors.grey))),
            ]),
          ]),
          const Spacer(),
          ElevatedButton(
            onPressed: () {},
            style: ElevatedButton.styleFrom(backgroundColor: Colors.blue.shade600),
            child: const Text('预订', style: TextStyle(color: Colors.white)),
          ),
        ]),
      ));
      list.add(const SizedBox(height: 16));
    }

    // Amenities
    if (item['amenities'] != null && item['amenities'].toString().isNotEmpty) {
      list.add(Text('设施服务', style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600)));
      list.add(const SizedBox(height: 8));
      final amens = item['amenities'].toString().split(',');
      list.add(Wrap(
        spacing: 8,
        runSpacing: 8,
        children: amens.map((a) => Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
          decoration: BoxDecoration(
            color: Colors.blue.shade50,
            borderRadius: BorderRadius.circular(20),
          ),
          child: Text(a.trim(), style: TextStyle(fontSize: 13, color: Colors.blue.shade700)),
        )).toList(),
      ));
      list.add(const SizedBox(height: 16));
    }

    // Description
    if (item['description'] != null && item['description'].toString().isNotEmpty) {
      list.add(Text('酒店介绍', style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600)));
      list.add(const SizedBox(height: 6));
      list.add(Text(item['description'].toString(), style: AppTheme.bodyText(theme.textTheme)));
    }

    return list;
  }
}
