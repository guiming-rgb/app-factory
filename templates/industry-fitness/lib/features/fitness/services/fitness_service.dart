import "package:supabase_flutter/supabase_flutter.dart";

/// 健身服务 — 对标 Keep / 训记
class FitnessService {
  final SupabaseClient _client;
  FitnessService(this._client);

  // ─── 训练记录 ──────────────────────────────

  Future<List<Map<String, dynamic>>> getWorkouts({int limit = 50}) async {
    final rows = await _client.from("workouts").select("*").order("created_at", ascending: false).limit(limit);
    return (rows as List<dynamic>).cast<Map<String, dynamic>>();
  }

  Future<void> addWorkout(Map<String, dynamic> data) async {
    await _client.from("workouts").insert({...data, 'user_id': _client.auth.currentUser!.id});
  }

  // ─── 身体数据 ──────────────────────────────

  Future<List<Map<String, dynamic>>> getBodyStats({int limit = 30}) async {
    final rows = await _client.from("body_stats").select("*").order("recorded_at", ascending: false).limit(limit);
    return (rows as List<dynamic>).cast<Map<String, dynamic>>();
  }

  Future<void> addBodyStat(Map<String, dynamic> data) async {
    await _client.from("body_stats").insert({...data, 'user_id': _client.auth.currentUser!.id});
  }

  // ─── 统计 ──────────────────────────────────

  Future<Map<String, dynamic>> getWeeklySummary() async {
    final weekAgo = DateTime.now().subtract(const Duration(days: 7)).toIso8601String();
    final rows = await _client.from("workouts").select("duration_min,calories").gte("created_at", weekAgo);
    int totalMin = 0, totalCal = 0;
    for (final r in rows as List<dynamic>) {
      totalMin += (r as Map)['duration_min'] as int? ?? 0;
      totalCal += (r as Map)['calories'] as int? ?? 0;
    }
    return {'total_minutes': totalMin, 'total_calories': totalCal, 'workout_count': rows.length};
  }
}
