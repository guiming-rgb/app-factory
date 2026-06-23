import 'package:supabase_flutter/supabase_flutter.dart';

class Article {
  final String id;
  final String author_id;
  final String title;
  final String? summary;
  final String? content;
  final String? cover;
  final String? category_id;
  final String? tags;
  final int? read_minutes;
  final int likes;
  final int bookmarks;
  final DateTime created_at;

  const Article({
    required this.id?,
    required this.author_id?,
    required this.title?,
    this.summary,
    this.content,
    this.cover,
    this.category_id,
    this.tags,
    this.read_minutes,
    required this.likes?,
    required this.bookmarks?,
    required this.created_at?,
  });

  factory Article.fromJson(Map<String, dynamic> json) => Article(      id: json['id'] as String,
      author_id: json['author_id'] as String,
      title: json['title'] as String,
      summary: json['summary'] as String?,
      content: json['content'] as String?,
      cover: json['cover'] as String?,
      category_id: json['category_id'] as String?,
      tags: json['tags'] as String?,
      read_minutes: (json['read_minutes'] as num?)?.toInt(),
      likes: (json['likes'] as num?)?.toInt() ?? 0,
      bookmarks: (json['bookmarks'] as num?)?.toInt() ?? 0,
      created_at: DateTime.parse(json['created_at'] as String),
  );

  Map<String, dynamic> toJson() => {
      'id': id,
      'author_id': author_id,
      'title': title,
      'summary': summary,
      'content': content,
      'cover': cover,
      'category_id': category_id,
      'tags': tags,
      'read_minutes': read_minutes,
      'likes': likes,
      'bookmarks': bookmarks,
      'created_at': created_at.toIso8601String(),
  };
}
