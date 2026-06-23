import 'package:supabase_flutter/supabase_flutter.dart';

class Profile {
  final String id;
  final String user_id;
  final String display_name;
  final String? bio;
  final int? age;
  final String? gender;
  final String? photos;
  final DateTime created_at;

  const Profile({
    required this.id?,
    required this.user_id?,
    required this.display_name?,
    this.bio,
    this.age,
    this.gender,
    this.photos,
    required this.created_at?,
  });

  factory Profile.fromJson(Map<String, dynamic> json) => Profile(      id: json['id'] as String,
      user_id: json['user_id'] as String,
      display_name: json['display_name'] as String,
      bio: json['bio'] as String?,
      age: (json['age'] as num?)?.toInt(),
      gender: json['gender'] as String?,
      photos: json['photos'] as String?,
      created_at: DateTime.parse(json['created_at'] as String),
  );

  Map<String, dynamic> toJson() => {
      'id': id,
      'user_id': user_id,
      'display_name': display_name,
      'bio': bio,
      'age': age,
      'gender': gender,
      'photos': photos,
      'created_at': created_at.toIso8601String(),
  };
}
