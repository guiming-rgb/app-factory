import 'package:supabase_flutter/supabase_flutter.dart';

class MatchItem {
  final String id;
  final String home_team;
  final String away_team;
  final int? home_score;
  final int? away_score;
  final String? league;
  final DateTime match_date;
  final String status;
  final DateTime created_at;

  const MatchItem({
    required this.id?,
    required this.home_team?,
    required this.away_team?,
    this.home_score,
    this.away_score,
    this.league,
    required this.match_date?,
    required this.status?,
    required this.created_at?,
  });

  factory MatchItem.fromJson(Map<String, dynamic> json) => MatchItem(      id: json['id'] as String,
      home_team: json['home_team'] as String,
      away_team: json['away_team'] as String,
      home_score: (json['home_score'] as num?)?.toInt(),
      away_score: (json['away_score'] as num?)?.toInt(),
      league: json['league'] as String?,
      match_date: DateTime.parse(json['match_date'] as String),
      status: json['status'] as String,
      created_at: DateTime.parse(json['created_at'] as String),
  );

  Map<String, dynamic> toJson() => {
      'id': id,
      'home_team': home_team,
      'away_team': away_team,
      'home_score': home_score,
      'away_score': away_score,
      'league': league,
      'match_date': match_date.toIso8601String(),
      'status': status,
      'created_at': created_at.toIso8601String(),
  };
}
