import 'package:supabase_flutter/supabase_flutter.dart';

class City {
  final String id;
  final String user_id;
  final String name;
  final double lat;
  final double lon;
  final DateTime created_at;

  const City({
    required this.id?,
    required this.user_id?,
    required this.name?,
    required this.lat?,
    required this.lon?,
    required this.created_at?,
  });

  factory City.fromJson(Map<String, dynamic> json) => City(      id: json['id'] as String,
      user_id: json['user_id'] as String,
      name: json['name'] as String,
      lat: (json['lat'] as num?)?.toDouble() ?? 0.0,
      lon: (json['lon'] as num?)?.toDouble() ?? 0.0,
      created_at: DateTime.parse(json['created_at'] as String),
  );

  Map<String, dynamic> toJson() => {
      'id': id,
      'user_id': user_id,
      'name': name,
      'lat': lat,
      'lon': lon,
      'created_at': created_at.toIso8601String(),
  };
}
