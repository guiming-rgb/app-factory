import 'package:supabase_flutter/supabase_flutter.dart';

class VideoItem {
  final String id;
  final String title;
  final String url;
  final String? thumbnail;
  final String? category;
  final int? duration;
  final int views;
  final DateTime created_at;

  const VideoItem({
    required this.id?,
    required this.title?,
    required this.url?,
    this.thumbnail,
    this.category,
    this.duration,
    required this.views?,
    required this.created_at?,
  });

  factory VideoItem.fromJson(Map<String, dynamic> json) => VideoItem(      id: json['id'] as String,
      title: json['title'] as String,
      url: json['url'] as String,
      thumbnail: json['thumbnail'] as String?,
      category: json['category'] as String?,
      duration: (json['duration'] as num?)?.toInt(),
      views: (json['views'] as num?)?.toInt() ?? 0,
      created_at: DateTime.parse(json['created_at'] as String),
  );

  Map<String, dynamic> toJson() => {
      'id': id,
      'title': title,
      'url': url,
      'thumbnail': thumbnail,
      'category': category,
      'duration': duration,
      'views': views,
      'created_at': created_at.toIso8601String(),
  };
}
