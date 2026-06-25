import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../core/theme/app_theme.dart';
import '../services/ecommerce_service.dart';
import '../../../core/supabase/supabase_client.dart';

class ProductDetailPage extends StatefulWidget {
  final String itemId;
  const ProductDetailPage({super.key, required this.itemId});
  @override
  State<ProductDetailPage> createState() => _ProductDetailPageState();
}

class _ProductDetailPageState extends State<ProductDetailPage> {
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
      final result = await EcommerceService(client).getProduct(widget.itemId);
      setState(() { _item = result; _loading = false; });
    } catch (e) {
      setState(() { _error = e.toString(); _loading = false; });
    }
  }

  Map<String, dynamic> _sampleData() {
    return {
      'id': 'demo-1',
      'name': '华为 MateBook X Pro 2026',
      'price': 12999.00,
      'original_price': 14999.00,
      'images': [
        'https://picsum.photos/seed/product1/600/600',
        'https://picsum.photos/seed/product2/600/600',
        'https://picsum.photos/seed/product3/600/600',
      ],
      'description': '华为最新旗舰轻薄本，搭载 Intel Core Ultra 9 处理器，'
          '32GB LPDDR5X 内存，1TB NVMe SSD，14.2 英寸 3:2 比例 OLED 触控屏，'
          '分辨率 3120 x 2080，支持 120Hz 刷新率。\n\n'
          '• Intel Core Ultra 9 285H 处理器\n'
          '• 32GB LPDDR5X 内存\n'
          '• 1TB NVMe PCIe 4.0 SSD\n'
          '• 14.2" 3:2 OLED 3120x2080 120Hz\n'
          '• 70Wh 大电池，续航 15 小时\n'
          '• Windows 11 家庭中文版',
      'sales': 5823,
      'rating': 4.8,
      'stock': 126,
      'category_id': 'laptop',
      'tags': ['笔记本', '华为', '轻薄本'],
      'is_recommended': true,
      'created_at': '2026-06-01T00:00:00Z',
    };
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      appBar: AppBar(title: Text(_item?['name'] ?? _item?['title'] ?? '商品详情')),
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
          height: 300,
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
                  color: i == 0 ? Colors.teal : Colors.grey.shade300,
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
      style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold),
    ));
    list.add(const SizedBox(height: 8));

    // Price row
    final price = item['price'];
    final originalPrice = item['original_price'];
    list.add(Row(crossAxisAlignment: CrossAxisAlignment.end, children: [
      Text(
        price != null ? '¥${(price as num).toStringAsFixed(2)}' : '',
        style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: Colors.red.shade600),
      ),
      const SizedBox(width: 8),
      if (originalPrice != null && (originalPrice as num) > (price as num))
        Text(
          '¥${originalPrice.toStringAsFixed(2)}',
          style: TextStyle(
            decoration: TextDecoration.lineThrough,
            color: Colors.grey.shade400,
            fontSize: 14,
          ),
        ),
      if (originalPrice != null && originalPrice > price)
        Container(
          margin: const EdgeInsets.only(left: 8),
          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
          decoration: BoxDecoration(
            color: Colors.red.shade50,
            borderRadius: BorderRadius.circular(4),
          ),
          child: Text(
            '-${(((originalPrice - price) / originalPrice) * 100).toStringAsFixed(0)}%',
            style: TextStyle(fontSize: 11, color: Colors.red.shade600, fontWeight: FontWeight.w600),
          ),
        ),
    ]));
    list.add(const SizedBox(height: 12));

    // Rating + Sales row
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
      Text('已售 ${item['sales'] ?? 0}', style: AppTheme.caption(theme.textTheme)),
      const SizedBox(width: 16),
      if (item['stock'] != null)
        Text(
          '库存 ${item['stock']} 件',
          style: TextStyle(
            fontSize: 12,
            color: (item['stock'] as num) > 0 ? Colors.green : Colors.red,
          ),
        ),
    ]));
    list.add(const SizedBox(height: 16));

    // Description
    if (item['description'] != null && item['description'].toString().isNotEmpty) {
      list.add(Text('商品描述', style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600)));
      list.add(const SizedBox(height: 6));
      list.add(Text(item['description'].toString(), style: AppTheme.bodyText(theme.textTheme)));
    }

    return list;
  }
}
