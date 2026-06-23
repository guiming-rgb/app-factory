import 'package:supabase_flutter/supabase_flutter.dart';

class Post {
  final String id;
  final String user_id;
  final String content;
  final String? images;
  final String? topic_id;
  final int likes;
  final int comments;
  final DateTime created_at;

  const Post({
    required this.id?,
    required this.user_id?,
    required this.content?,
    this.images,
    this.topic_id,
    required this.likes?,
    required this.comments?,
    required this.created_at?,
  });

  factory Post.fromJson(Map<String, dynamic> json) => Post(      id: json['id'] as String,
      user_id: json['user_id'] as String,
      content: json['content'] as String,
      images: json['images'] as String?,
      topic_id: json['topic_id'] as String?,
      likes: (json['likes'] as num?)?.toInt() ?? 0,
      comments: (json['comments'] as num?)?.toInt() ?? 0,
      created_at: DateTime.parse(json['created_at'] as String),
  );

  Map<String, dynamic> toJson() => {
      'id': id,
      'user_id': user_id,
      'content': content,
      'images': images,
      'topic_id': topic_id,
      'likes': likes,
      'comments': comments,
      'created_at': created_at.toIso8601String(),
  };
}
