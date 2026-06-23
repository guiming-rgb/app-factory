import 'package:supabase_flutter/supabase_flutter.dart';

class GameScore {
  final String id;
  final String user_id;
  final int score;
  final int level;
  final DateTime created_at;

  const GameScore({
    required this.id?,
    required this.user_id?,
    required this.score?,
    required this.level?,
    required this.created_at?,
  });

  factory GameScore.fromJson(Map<String, dynamic> json) => GameScore(      id: json['id'] as String,
      user_id: json['user_id'] as String,
      score: (json['score'] as num?)?.toInt() ?? 0,
      level: (json['level'] as num?)?.toInt() ?? 0,
      created_at: DateTime.parse(json['created_at'] as String),
  );

  Map<String, dynamic> toJson() => {
      'id': id,
      'user_id': user_id,
      'score': score,
      'level': level,
      'created_at': created_at.toIso8601String(),
  };
}
