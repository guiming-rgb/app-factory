import 'package:supabase_flutter/supabase_flutter.dart';

class Product {
  final String id;
  final String user_id;
  final String name;
  final double price;
  final double? original_price;
  final List<String>? images;
  final String? description;
  final int? sales;
  final double? rating;
  final int? stock;
  final DateTime created_at;

  const Product({
    required this.id?,
    required this.user_id?,
    required this.name?,
    required this.price?,
    this.original_price,
    this.images,
    this.description,
    this.sales,
    this.rating,
    this.stock,
    required this.created_at?,
  });

  factory Product.fromJson(Map<String, dynamic> json) => Product(      id: json['id'] as String,
      user_id: json['user_id'] as String,
      name: json['name'] as String,
      price: (json['price'] as num?)?.toDouble() ?? 0.0,
      original_price: (json['original_price'] as num?)?.toDouble(),
      images: (json['images'] as List?)?.cast<String>(),
      description: json['description'] as String?,
      sales: (json['sales'] as num?)?.toInt(),
      rating: (json['rating'] as num?)?.toDouble(),
      stock: (json['stock'] as num?)?.toInt(),
      created_at: DateTime.parse(json['created_at'] as String),
  );

  Map<String, dynamic> toJson() => {
      'id': id,
      'user_id': user_id,
      'name': name,
      'price': price,
      'original_price': original_price,
      'images': images,
      'description': description,
      'sales': sales,
      'rating': rating,
      'stock': stock,
      'created_at': created_at.toIso8601String(),
  };
}
