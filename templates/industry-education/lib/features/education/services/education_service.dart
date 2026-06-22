import "package:supabase_flutter/supabase_flutter.dart";

/// 教育服务 — 对标超级课程表 / ClassIn
class EducationService {
  final SupabaseClient _client;
  EducationService(this._client);

  // ─── 课程 CRUD ──────────────────────────────

  Future<List<Map<String, dynamic>>> getCourses() async {
    final rows = await _client.from("courses").select("*").order("day_of_week,start_time");
    return (rows as List<dynamic>).cast<Map<String, dynamic>>();
  }

  Future<void> addCourse(Map<String, dynamic> data) async {
    await _client.from("courses").insert({...data, 'user_id': _client.auth.currentUser!.id});
  }

  // ─── 作业 ──────────────────────────────────

  Future<List<Map<String, dynamic>>> getAssignments({String? courseId}) async {
    var query = _client.from("assignments").select("*, courses(name)").order("deadline");
    if (courseId != null) query = query.eq("course_id", courseId);
    final rows = await query;
    return (rows as List<dynamic>).cast<Map<String, dynamic>>();
  }

  Future<void> addAssignment(Map<String, dynamic> data) async {
    await _client.from("assignments").insert({...data, 'user_id': _client.auth.currentUser!.id});
  }

  // ─── 成绩 ──────────────────────────────────

  Future<List<Map<String, dynamic>>> getGrades({String? courseId}) async {
    var query = _client.from("grades").select("*, courses(name)").order("created_at", ascending: false);
    if (courseId != null) query = query.eq("course_id", courseId);
    final rows = await query;
    return (rows as List<dynamic>).cast<Map<String, dynamic>>();
  }

  // ─── 今日课表 ──────────────────────────────

  Future<List<Map<String, dynamic>>> getTodaySchedule() async {
    final today = DateTime.now().weekday; // Mon=1, Sun=7 → 0=Mon in Dart
    final dartDay = today == 7 ? 0 : today; // Convert Sun(7) to 0
    final rows = await _client.from("courses").select("*").eq("day_of_week", dartDay).order("start_time");
    return (rows as List<dynamic>).cast<Map<String, dynamic>>();
  }
}
