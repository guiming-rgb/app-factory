import 'package:supabase_flutter/supabase_flutter.dart';

class Restaurant {
  final String id;
  final String name;
  final String? cuisine;
  final double? rating;
  final int? delivery_time;
  final double? delivery_fee;
  final String? logo;
  final DateTime created_at;

  const Restaurant({
    required this.id?,
    required this.name?,
    this.cuisine,
    this.rating,
    this.delivery_time,
    this.delivery_fee,
    this.logo,
    required this.created_at?,
  });

  factory Restaurant.fromJson(Map<String, dynamic> json) => Restaurant(      id: json['id'] as String,
      name: json['name'] as String,
      cuisine: json['cuisine'] as String?,
      rating: (json['rating'] as num?)?.toDouble(),
      delivery_time: (json['delivery_time'] as num?)?.toInt(),
      delivery_fee: (json['delivery_fee'] as num?)?.toDouble(),
      logo: json['logo'] as String?,
      created_at: DateTime.parse(json['created_at'] as String),
  );

  Map<String, dynamic> toJson() => {
      'id': id,
      'name': name,
      'cuisine': cuisine,
      'rating': rating,
      'delivery_time': delivery_time,
      'delivery_fee': delivery_fee,
      'logo': logo,
      'created_at': created_at.toIso8601String(),
  };
}
