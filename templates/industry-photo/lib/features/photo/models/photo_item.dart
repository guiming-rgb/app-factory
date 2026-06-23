import 'package:supabase_flutter/supabase_flutter.dart';

class PhotoItem {
  final String id;
  final String user_id;
  final String title;
  final String image_url;
  final String? description;
  final int likes;
  final DateTime created_at;

  const PhotoItem({
    required this.id?,
    required this.user_id?,
    required this.title?,
    required this.image_url?,
    this.description,
    required this.likes?,
    required this.created_at?,
  });

  factory PhotoItem.fromJson(Map<String, dynamic> json) => PhotoItem(      id: json['id'] as String,
      user_id: json['user_id'] as String,
      title: json['title'] as String,
      image_url: json['image_url'] as String,
      description: json['description'] as String?,
      likes: (json['likes'] as num?)?.toInt() ?? 0,
      created_at: DateTime.parse(json['created_at'] as String),
  );

  Map<String, dynamic> toJson() => {
      'id': id,
      'user_id': user_id,
      'title': title,
      'image_url': image_url,
      'description': description,
      'likes': likes,
      'created_at': created_at.toIso8601String(),
  };
}
