import 'package:supabase_flutter/supabase_flutter.dart';

class Workout {
  final String id;
  final String user_id;
  final String name;
  final int duration_min;
  final int? calories;
  final String? level;
  final String? type;
  final DateTime created_at;

  const Workout({
    required this.id?,
    required this.user_id?,
    required this.name?,
    required this.duration_min?,
    this.calories,
    this.level,
    this.type,
    required this.created_at?,
  });

  factory Workout.fromJson(Map<String, dynamic> json) => Workout(      id: json['id'] as String,
      user_id: json['user_id'] as String,
      name: json['name'] as String,
      duration_min: (json['duration_min'] as num?)?.toInt() ?? 0,
      calories: (json['calories'] as num?)?.toInt(),
      level: json['level'] as String?,
      type: json['type'] as String?,
      created_at: DateTime.parse(json['created_at'] as String),
  );

  Map<String, dynamic> toJson() => {
      'id': id,
      'user_id': user_id,
      'name': name,
      'duration_min': duration_min,
      'calories': calories,
      'level': level,
      'type': type,
      'created_at': created_at.toIso8601String(),
  };
}
