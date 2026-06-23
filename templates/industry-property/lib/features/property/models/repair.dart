import 'package:supabase_flutter/supabase_flutter.dart';

class Repair {
  final String id;
  final String user_id;
  final String title;
  final String description;
  final String status;
  final String? image;
  final DateTime created_at;

  const Repair({
    required this.id?,
    required this.user_id?,
    required this.title?,
    required this.description?,
    required this.status?,
    this.image,
    required this.created_at?,
  });

  factory Repair.fromJson(Map<String, dynamic> json) => Repair(      id: json['id'] as String,
      user_id: json['user_id'] as String,
      title: json['title'] as String,
      description: json['description'] as String,
      status: json['status'] as String,
      image: json['image'] as String?,
      created_at: DateTime.parse(json['created_at'] as String),
  );

  Map<String, dynamic> toJson() => {
      'id': id,
      'user_id': user_id,
      'title': title,
      'description': description,
      'status': status,
      'image': image,
      'created_at': created_at.toIso8601String(),
  };
}
