import "package:supabase_flutter/supabase_flutter.dart";

/// 医疗健康服务 — 科室、医生、预约、病历
class MedicalService {
  final SupabaseClient _client;
  MedicalService(this._client);

  // ─── 科室 ────────────────────────────────────

  /// 获取所有科室列表
  Future<List<Map<String, dynamic>>> getDepartments() async {
    try {
      final rows = await _client
          .from("departments")
          .select("*")
          .order("name");
      return (rows as List<dynamic>).cast<Map<String, dynamic>>();
    } catch (_) {
      return [];
    }
  }

  /// 获取科室详情（含该科室下医生数量等）
  Future<Map<String, dynamic>?> getDepartmentDetail(String deptId) async {
    try {
      final rows = await _client
          .from("departments")
          .select("*, doctors(count)")
          .eq("id", deptId)
          .single();
      return rows as Map<String, dynamic>?;
    } catch (_) {
      return null;
    }
  }

  // ─── 医生 ────────────────────────────────────

  /// 获取医生列表，支持按科室筛选和姓名搜索
  Future<List<Map<String, dynamic>>> getDoctors({
    String? deptId,
    String? search,
    int page = 1,
    int limit = 20,
  }) async {
    try {
      var query = _client
          .from("doctors")
          .select("*, department:department_id(*)")
          .order("name")
          .range((page - 1) * limit, page * limit - 1);
      if (deptId != null && deptId.isNotEmpty) {
        query = query.eq("department_id", deptId);
      }
      if (search != null && search.isNotEmpty) {
        query = query.or(
            "name.ilike.%$search%,title.ilike.%$search%,hospital.ilike.%$search%");
      }
      final rows = await query;
      return (rows as List<dynamic>).cast<Map<String, dynamic>>();
    } catch (_) {
      return [];
    }
  }

  /// 获取医生详情（含排班等信息）
  Future<Map<String, dynamic>?> getDoctorDetail(String doctorId) async {
    try {
      final rows = await _client
          .from("doctors")
          .select("*, department:department_id(*), schedules(*)")
          .eq("id", doctorId)
          .single();
      return rows as Map<String, dynamic>?;
    } catch (_) {
      return null;
    }
  }

  // ─── 预约 ────────────────────────────────────

  /// 预约挂号
  Future<Map<String, dynamic>?> makeAppointment({
    required String doctorId,
    required DateTime time,
    String? notes,
  }) async {
    try {
      final uid = _client.auth.currentUser?.id;
      if (uid == null) return null;
      final rows = await _client
          .from("appointments")
          .insert({
            'user_id': uid,
            'doctor_id': doctorId,
            'appointment_time': time.toIso8601String(),
            'notes': notes,
            'status': 'pending',
          })
          .select("*, doctor:doctor_id(*)")
          .single();
      return rows as Map<String, dynamic>?;
    } catch (_) {
      return null;
    }
  }

  /// 取消预约
  Future<bool> cancelAppointment(String appointmentId) async {
    try {
      final uid = _client.auth.currentUser?.id;
      if (uid == null) return false;
      await _client
          .from("appointments")
          .update({'status': 'cancelled', 'updated_at': DateTime.now().toIso8601String()})
          .eq("id", appointmentId)
          .eq("user_id", uid);
      return true;
    } catch (_) {
      return false;
    }
  }

  /// 获取当前用户预约列表
  Future<List<Map<String, dynamic>>> getMyAppointments({
    String? status,
    int limit = 30,
  }) async {
    try {
      final uid = _client.auth.currentUser?.id;
      if (uid == null) return [];
      var query = _client
          .from("appointments")
          .select("*, doctor:doctor_id(*, department:department_id(*))")
          .eq("user_id", uid)
          .order("appointment_time", ascending: true)
          .limit(limit);
      if (status != null && status.isNotEmpty) {
        query = query.eq("status", status);
      }
      final rows = await query;
      return (rows as List<dynamic>).cast<Map<String, dynamic>>();
    } catch (_) {
      return [];
    }
  }

  // ─── 病历 ────────────────────────────────────

  /// 获取当前用户的病历/就诊记录
  Future<List<Map<String, dynamic>>> getMedicalRecords({int limit = 30}) async {
    try {
      final uid = _client.auth.currentUser?.id;
      if (uid == null) return [];
      final rows = await _client
          .from("medical_records")
          .select("*, doctor:doctor_id(*, department:department_id(*))")
          .eq("user_id", uid)
          .order("created_at", ascending: false)
          .limit(limit);
      return (rows as List<dynamic>).cast<Map<String, dynamic>>();
    } catch (_) {
      return [];
    }
  }

  /// 获取单条病历详情
  Future<Map<String, dynamic>?> getMedicalRecordDetail(String recordId) async {
    try {
      final rows = await _client
          .from("medical_records")
          .select("*, doctor:doctor_id(*, department:department_id(*))")
          .eq("id", recordId)
          .single();
      return rows as Map<String, dynamic>?;
    } catch (_) {
      return null;
    }
  }
}
