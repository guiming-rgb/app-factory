import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../core/theme/app_theme.dart';
import '../services/food_service.dart';
import '../../../core/supabase/supabase_client.dart';

class RestaurantDetailPage extends StatefulWidget {
  final String itemId;
  const RestaurantDetailPage({super.key, required this.itemId});
  @override
  State<RestaurantDetailPage> createState() => _RestaurantDetailPageState();
}

class _RestaurantDetailPageState extends State<RestaurantDetailPage> {
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
      final result = await FoodService(client).getRestaurant(widget.itemId);
      setState(() { _item = result; _loading = false; });
    } catch (e) {
      setState(() { _error = e.toString(); _loading = false; });
    }
  }

  Map<String, dynamic> _sampleData() {
    return {
      'id': 'demo-1',
      'name': '川味轩火锅',
      'cuisine': '川菜',
      'price': 128.00,
      'original_price': 168.00,
      'image': 'https://picsum.photos/seed/restaurant1/800/400',
      'description': '正宗四川火锅，使用传统秘制锅底，麻辣鲜香。'
          '精选上等牛油、花椒、辣椒，慢火熬制 8 小时。'
          '提供毛肚、黄喉、鹅肠等经典涮品，还有免费自助小料台。',
      'rating': 4.7,
      'sales': 3256,
      'delivery_time': 35,
      'delivery_fee': 5.00,
      'address': '成都市锦江区春熙路 128 号',
      'phone': '028-8888-6666',
      'business_hours': '11:00 - 22:30',
      'created_at': '2026-03-15T00:00:00Z',
    };
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      appBar: AppBar(title: Text(_item?['name'] ?? _item?['title'] ?? '商家详情')),
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

    // Image
    if (item['image'] != null && item['image'].toString().isNotEmpty) {
      list.add(ClipRRect(
        borderRadius: BorderRadius.circular(12),
        child: Image.network(
          item['image'].toString(),
          height: 200,
          width: double.infinity,
          fit: BoxFit.cover,
          errorBuilder: (_, __, ___) => Container(
            height: 200,
            color: Colors.grey.shade200,
            child: const Center(child: Icon(Icons.restaurant, size: 48, color: Colors.grey)),
          ),
          loadingBuilder: (_, child, progress) =>
              progress == null ? child : const SizedBox(height: 200, child: Center(child: CircularProgressIndicator())),
        ),
      ));
      list.add(const SizedBox(height: 16));
    }

    // Name + cuisine
    list.add(Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Expanded(
        child: Text(
          item['name'] ?? '',
          style: theme.textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.bold),
        ),
      ),
      if (item['cuisine'] != null)
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
          decoration: BoxDecoration(
            color: Colors.red.shade50,
            borderRadius: BorderRadius.circular(6),
          ),
          child: Text(
            item['cuisine'].toString(),
            style: TextStyle(fontSize: 12, color: Colors.red.shade600, fontWeight: FontWeight.w600),
          ),
        ),
    ]));
    list.add(const SizedBox(height: 8));

    // Rating + Sales
    list.add(Row(children: [
      ...List.generate(5, (i) => Icon(
        item['rating'] != null && (item['rating'] as num) > i ? Icons.star : Icons.star_border,
        size: 16,
        color: Colors.amber,
      )),
      const SizedBox(width: 6),
      Text(item['rating']?.toString() ?? '', style: AppTheme.caption(theme.textTheme)),
      const SizedBox(width: 16),
      const Icon(Icons.shopping_cart, size: 14, color: Colors.grey),
      const SizedBox(width: 4),
      Text('月售 ${item['sales'] ?? 0}', style: AppTheme.caption(theme.textTheme)),
    ]));
    list.add(const SizedBox(height: 12));

    // Price with original price strikethrough
    final price = item['price'];
    final originalPrice = item['original_price'];
    list.add(Row(children: [
      const Icon(Icons.monetization_on, size: 18, color: Colors.red),
      const SizedBox(width: 4),
      Text(
        price != null ? '¥${(price as num).toStringAsFixed(2)}' : '',
        style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Colors.red.shade600),
      ),
      if (originalPrice != null && (originalPrice as num) > (price as num)) ...[
        const SizedBox(width: 8),
        Text(
          '¥${originalPrice.toStringAsFixed(2)}',
          style: TextStyle(decoration: TextDecoration.lineThrough, color: Colors.grey.shade400, fontSize: 14),
        ),
      ],
    ]));
    list.add(const SizedBox(height: 12));

    // Delivery info
    list.add(Row(children: [
      if (item['delivery_time'] != null) ...[
        const Icon(Icons.delivery_dining, size: 16, color: Colors.grey),
        const SizedBox(width: 4),
        Text('约 ${item['delivery_time']} 分钟', style: AppTheme.caption(theme.textTheme)),
        const SizedBox(width: 16),
      ],
      if (item['delivery_fee'] != null) ...[
        const Icon(Icons.money, size: 16, color: Colors.grey),
        const SizedBox(width: 4),
        Text('配送费 ¥${(item['delivery_fee'] as num).toStringAsFixed(1)}',
            style: AppTheme.caption(theme.textTheme)),
      ],
    ]));
    list.add(const SizedBox(height: 16));

    // Description
    if (item['description'] != null && item['description'].toString().isNotEmpty) {
      list.add(Text('商家介绍', style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600)));
      list.add(const SizedBox(height: 6));
      list.add(Text(item['description'].toString(), style: AppTheme.bodyText(theme.textTheme)));
      list.add(const SizedBox(height: 16));
    }

    // Info section
    if (item['address'] != null || item['phone'] != null || item['business_hours'] != null) {
      list.add(Text('商家信息', style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600)));
      list.add(const SizedBox(height: 8));
      if (item['address'] != null)
        list.add(Padding(
          padding: const EdgeInsets.only(bottom: 6),
          child: Row(children: [
            const Icon(Icons.location_on, size: 16, color: Colors.grey),
            const SizedBox(width: 6),
            Text(item['address'].toString(), style: TextStyle(fontSize: 13)),
          ]),
        ));
      if (item['phone'] != null)
        list.add(Padding(
          padding: const EdgeInsets.only(bottom: 6),
          child: Row(children: [
            const Icon(Icons.phone, size: 16, color: Colors.grey),
            const SizedBox(width: 6),
            Text(item['phone'].toString(), style: TextStyle(fontSize: 13)),
          ]),
        ));
      if (item['business_hours'] != null)
        list.add(Padding(
          padding: const EdgeInsets.only(bottom: 6),
          child: Row(children: [
            const Icon(Icons.access_time, size: 16, color: Colors.grey),
            const SizedBox(width: 6),
            Text(item['business_hours'].toString(), style: TextStyle(fontSize: 13)),
          ]),
        ));
    }

    return list;
  }
}
