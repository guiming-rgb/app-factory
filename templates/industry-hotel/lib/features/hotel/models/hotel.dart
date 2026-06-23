import 'package:supabase_flutter/supabase_flutter.dart';

class Hotel {
  final String id;
  final String name;
  final String? city;
  final String? address;
  final double? rating;
  final double? price_per_night;
  final String? amenities;
  final String? image_url;
  final DateTime created_at;

  const Hotel({
    required this.id?,
    required this.name?,
    this.city,
    this.address,
    this.rating,
    this.price_per_night,
    this.amenities,
    this.image_url,
    required this.created_at?,
  });

  factory Hotel.fromJson(Map<String, dynamic> json) => Hotel(      id: json['id'] as String,
      name: json['name'] as String,
      city: json['city'] as String?,
      address: json['address'] as String?,
      rating: (json['rating'] as num?)?.toDouble(),
      price_per_night: (json['price_per_night'] as num?)?.toDouble(),
      amenities: json['amenities'] as String?,
      image_url: json['image_url'] as String?,
      created_at: DateTime.parse(json['created_at'] as String),
  );

  Map<String, dynamic> toJson() => {
      'id': id,
      'name': name,
      'city': city,
      'address': address,
      'rating': rating,
      'price_per_night': price_per_night,
      'amenities': amenities,
      'image_url': image_url,
      'created_at': created_at.toIso8601String(),
  };
}
