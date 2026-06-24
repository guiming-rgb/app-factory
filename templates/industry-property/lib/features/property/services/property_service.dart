import "package:supabase_flutter/supabase_flutter.dart";

/// 物业服务 — 报修/缴费/公告/访客/设施预约
class PropertyService {
  final SupabaseClient _client;
  PropertyService(this._client);

  // ─── 报修 ────────────────────────────────────

  /// 提交报修工单
  Future<Map<String, dynamic>?> submitRepair({
    required String title,
    required String description,
    String? image,
  }) async {
    try {
      final resp = await _client.from("repairs").insert({
        'user_id': _client.auth.currentUser!.id,
        'title': title,
        'description': description,
        'image': image,
        'status': 'pending',
      }).select("id").single();
      return resp as Map<String, dynamic>?;
    } catch (_) {
      return null;
    }
  }

  /// 获取当前用户的报修列表（支持分页和状态筛选）
  Future<List<Map<String, dynamic>>> getMyRepairs({
    String? status,
    int page = 1,
    int limit = 20,
  }) async {
    try {
      final from = (page - 1) * limit;
      var query = _client.from("repairs").select("*")
          .eq("user_id", _client.auth.currentUser!.id)
          .order("created_at", ascending: false)
          .range(from, from + limit - 1);
      if (status != null) query = query.eq("status", status);
      final rows = await query;
      return (rows as List<dynamic>).cast<Map<String, dynamic>>();
    } catch (_) {
      return [];
    }
  }

  /// 获取报修详情
  Future<Map<String, dynamic>?> getRepair(String id) async {
    try {
      final rows = await _client.from("repairs").select("*").eq("id", id).maybeSingle();
      return rows as Map<String, dynamic>?;
    } catch (_) {
      return null;
    }
  }

  /// 更新报修状态
  Future<bool> updateRepairStatus(String id, String status, {String? remark}) async {
    try {
      await _client.from("repairs").update({
        'status': status,
        if (remark != null) 'remark': remark,
      }).eq("id", id);
      return true;
    } catch (_) {
      return false;
    }
  }

  // ─── 缴费 ────────────────────────────────────

  /// 获取缴费记录列表
  Future<List<Map<String, dynamic>>> getPayments({int page = 1, int limit = 20}) async {
    try {
      final from = (page - 1) * limit;
      final rows = await _client.from("payments").select("*")
          .eq("user_id", _client.auth.currentUser!.id)
          .order("due_date", ascending: false)
          .range(from, from + limit - 1);
      return (rows as List<dynamic>).cast<Map<String, dynamic>>();
    } catch (_) {
      return [];
    }
  }

  /// 缴费（标记为已支付）
  Future<bool> payBill(String paymentId) async {
    try {
      await _client.from("payments").update({
        'status': 'paid',
        'paid_at': DateTime.now().toIso8601String(),
      }).eq("id", paymentId).eq("user_id", _client.auth.currentUser!.id);
      return true;
    } catch (_) {
      return false;
    }
  }

  // ─── 公告 ────────────────────────────────────

  /// 获取小区公告列表（支持分页）
  Future<List<Map<String, dynamic>>> getNotices({int page = 1, int limit = 20}) async {
    try {
      final from = (page - 1) * limit;
      final rows = await _client.from("notices").select("*")
          .order("created_at", ascending: false)
          .range(from, from + limit - 1);
      return (rows as List<dynamic>).cast<Map<String, dynamic>>();
    } catch (_) {
      return [];
    }
  }

  /// 获取公告详情
  Future<Map<String, dynamic>?> getNotice(String id) async {
    try {
      final rows = await _client.from("notices").select("*").eq("id", id).maybeSingle();
      return rows as Map<String, dynamic>?;
    } catch (_) {
      return null;
    }
  }

  // ─── 访客 ────────────────────────────────────

  /// 预登记访客
  Future<Map<String, dynamic>?> preregisterVisitor({
    required String visitorName,
    required String visitorPhone,
    required DateTime visitTime,
    String? plateNumber,
  }) async {
    try {
      final resp = await _client.from("visitors").insert({
        'user_id': _client.auth.currentUser!.id,
        'visitor_name': visitorName,
        'visitor_phone': visitorPhone,
        'visit_time': visitTime.toIso8601String(),
        'plate_number': plateNumber,
        'status': 'pending',
      }).select("id").single();
      return resp as Map<String, dynamic>?;
    } catch (_) {
      return null;
    }
  }

  /// 获取访客记录列表
  Future<List<Map<String, dynamic>>> getVisitors({int page = 1, int limit = 20}) async {
    try {
      final from = (page - 1) * limit;
      final rows = await _client.from("visitors").select("*")
          .eq("user_id", _client.auth.currentUser!.id)
          .order("visit_time", ascending: false)
          .range(from, from + limit - 1);
      return (rows as List<dynamic>).cast<Map<String, dynamic>>();
    } catch (_) {
      return [];
    }
  }

  // ─── 设施预约 ────────────────────────────────

  /// 获取可预约设施列表
  Future<List<Map<String, dynamic>>> getFacilities({int page = 1, int limit = 20}) async {
    try {
      final from = (page - 1) * limit;
      final rows = await _client.from("facilities").select("*")
          .order("name", ascending: true)
          .range(from, from + limit - 1);
      return (rows as List<dynamic>).cast<Map<String, dynamic>>();
    } catch (_) {
      return [];
    }
  }

  /// 预约设施
  Future<Map<String, dynamic>?> bookFacility({
    required String facilityId,
    required DateTime startTime,
    required DateTime endTime,
  }) async {
    try {
      final resp = await _client.from("facility_bookings").insert({
        'user_id': _client.auth.currentUser!.id,
        'facility_id': facilityId,
        'start_time': startTime.toIso8601String(),
        'end_time': endTime.toIso8601String(),
        'status': 'confirmed',
      }).select("id").single();
      return resp as Map<String, dynamic>?;
    } catch (_) {
      return null;
    }
  }

  /// 获取我的预约列表
  Future<List<Map<String, dynamic>>> getMyBookings({int page = 1, int limit = 20}) async {
    try {
      final from = (page - 1) * limit;
      final rows = await _client.from("facility_bookings").select("*, facilities(*)")
          .eq("user_id", _client.auth.currentUser!.id)
          .order("start_time", ascending: false)
          .range(from, from + limit - 1);
      return (rows as List<dynamic>).cast<Map<String, dynamic>>();
    } catch (_) {
      return [];
    }
  }

  /// 取消预约
  Future<bool> cancelBooking(String bookingId) async {
    try {
      await _client.from("facility_bookings").update({'status': 'cancelled'})
          .eq("id", bookingId).eq("user_id", _client.auth.currentUser!.id);
      return true;
    } catch (_) {
      return false;
    }
  }
}
