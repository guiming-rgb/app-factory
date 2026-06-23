import 'package:supabase_flutter/supabase_flutter.dart';

class Job {
  final String id;
  final String title;
  final String company;
  final String? location;
  final String? salary;
  final String? type;
  final String? description;
  final String? requirements;
  final DateTime created_at;

  const Job({
    required this.id?,
    required this.title?,
    required this.company?,
    this.location,
    this.salary,
    this.type,
    this.description,
    this.requirements,
    required this.created_at?,
  });

  factory Job.fromJson(Map<String, dynamic> json) => Job(      id: json['id'] as String,
      title: json['title'] as String,
      company: json['company'] as String,
      location: json['location'] as String?,
      salary: json['salary'] as String?,
      type: json['type'] as String?,
      description: json['description'] as String?,
      requirements: json['requirements'] as String?,
      created_at: DateTime.parse(json['created_at'] as String),
  );

  Map<String, dynamic> toJson() => {
      'id': id,
      'title': title,
      'company': company,
      'location': location,
      'salary': salary,
      'type': type,
      'description': description,
      'requirements': requirements,
      'created_at': created_at.toIso8601String(),
  };
}
