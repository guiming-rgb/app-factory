import 'package:supabase_flutter/supabase_flutter.dart';

class Doctor {
  final String id;
  final String name;
  final String? title;
  final String? department_id;
  final String? hospital;
  final double? rating;
  final double? consultation_fee;
  final String? avatar;
  final DateTime created_at;

  const Doctor({
    required this.id?,
    required this.name?,
    this.title,
    this.department_id,
    this.hospital,
    this.rating,
    this.consultation_fee,
    this.avatar,
    required this.created_at?,
  });

  factory Doctor.fromJson(Map<String, dynamic> json) => Doctor(      id: json['id'] as String,
      name: json['name'] as String,
      title: json['title'] as String?,
      department_id: json['department_id'] as String?,
      hospital: json['hospital'] as String?,
      rating: (json['rating'] as num?)?.toDouble(),
      consultation_fee: (json['consultation_fee'] as num?)?.toDouble(),
      avatar: json['avatar'] as String?,
      created_at: DateTime.parse(json['created_at'] as String),
  );

  Map<String, dynamic> toJson() => {
      'id': id,
      'name': name,
      'title': title,
      'department_id': department_id,
      'hospital': hospital,
      'rating': rating,
      'consultation_fee': consultation_fee,
      'avatar': avatar,
      'created_at': created_at.toIso8601String(),
  };
}
