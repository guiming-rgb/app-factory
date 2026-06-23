import 'package:supabase_flutter/supabase_flutter.dart';

class Course {
  final String id;
  final String user_id;
  final String name;
  final String? teacher;
  final String? room;
  final int? day_of_week;
  final String? start_time;
  final String? end_time;
  final DateTime created_at;

  const Course({
    required this.id?,
    required this.user_id?,
    required this.name?,
    this.teacher,
    this.room,
    this.day_of_week,
    this.start_time,
    this.end_time,
    required this.created_at?,
  });

  factory Course.fromJson(Map<String, dynamic> json) => Course(      id: json['id'] as String,
      user_id: json['user_id'] as String,
      name: json['name'] as String,
      teacher: json['teacher'] as String?,
      room: json['room'] as String?,
      day_of_week: (json['day_of_week'] as num?)?.toInt(),
      start_time: json['start_time'] as String?,
      end_time: json['end_time'] as String?,
      created_at: DateTime.parse(json['created_at'] as String),
  );

  Map<String, dynamic> toJson() => {
      'id': id,
      'user_id': user_id,
      'name': name,
      'teacher': teacher,
      'room': room,
      'day_of_week': day_of_week,
      'start_time': start_time,
      'end_time': end_time,
      'created_at': created_at.toIso8601String(),
  };
}
