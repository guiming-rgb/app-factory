import 'package:supabase_flutter/supabase_flutter.dart';

/// 商品模型 — 对标淘宝/京东商品卡片的完整字段
class Product {
  final String id;
  final String name;
  final double price;
  final double? originalPrice;
  final List<String>? images;
  final String? description;
  final int? sales;
  final double? rating;
  final int? stock;
  final String? categoryId;
  final List<String>? tags;
  final bool? isRecommended;
  final DateTime createdAt;
  final DateTime? updatedAt;

  const Product({
    required this.id,
    required this.name,
    required this.price,
    this.originalPrice,
    this.images,
    this.description,
    this.sales,
    this.rating,
    this.stock,
    this.categoryId,
    this.tags,
    this.isRecommended,
    required this.createdAt,
    this.updatedAt,
  });

  bool get hasDiscount => originalPrice != null && originalPrice! > price;
  double get discountPercent => hasDiscount ? ((originalPrice! - price) / originalPrice! * 100).roundToDouble() : 0;

  factory Product.fromJson(Map<String, dynamic> json) => Product(
    id: json['id'] as String,
    name: json['name'] as String? ?? '',
    price: (json['price'] as num?)?.toDouble() ?? 0.0,
    originalPrice: (json['original_price'] as num?)?.toDouble(),
    images: _parseStringList(json['images']),
    description: json['description'] as String?,
    sales: (json['sales'] as num?)?.toInt(),
    rating: (json['rating'] as num?)?.toDouble(),
    stock: (json['stock'] as num?)?.toInt(),
    categoryId: json['category_id'] as String?,
    tags: _parseStringList(json['tags']),
    isRecommended: json['is_recommended'] as bool?,
    createdAt: DateTime.parse((json['created_at'] as String?) ?? DateTime.now().toIso8601String()),
    updatedAt: json['updated_at'] != null ? DateTime.parse(json['updated_at'] as String) : null,
  );

  Map<String, dynamic> toJson() => {
    'id': id,
    'name': name,
    'price': price,
    'original_price': originalPrice,
    'images': images,
    'description': description,
    'sales': sales,
    'rating': rating,
    'stock': stock,
    'category_id': categoryId,
    'tags': tags,
    'is_recommended': isRecommended,
    'created_at': createdAt.toIso8601String(),
    'updated_at': updatedAt?.toIso8601String(),
  };

  Product copyWith({
    String? id, String? name, double? price, double? originalPrice,
    List<String>? images, String? description, int? sales, double? rating,
    int? stock, String? categoryId, List<String>? tags, bool? isRecommended,
    DateTime? createdAt, DateTime? updatedAt,
  }) => Product(
    id: id ?? this.id, name: name ?? this.name,
    price: price ?? this.price, originalPrice: originalPrice ?? this.originalPrice,
    images: images ?? this.images, description: description ?? this.description,
    sales: sales ?? this.sales, rating: rating ?? this.rating,
    stock: stock ?? this.stock, categoryId: categoryId ?? this.categoryId,
    tags: tags ?? this.tags, isRecommended: isRecommended ?? this.isRecommended,
    createdAt: createdAt ?? this.createdAt, updatedAt: updatedAt ?? this.updatedAt,
  );

  static List<String>? _parseStringList(dynamic value) {
    if (value == null) return null;
    if (value is List) return value.map((e) => e.toString()).toList();
    if (value is String) return [value];
    return null;
  }
}
