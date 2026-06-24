import "package:supabase_flutter/supabase_flutter.dart";

/// 酒店服务 — 搜索/房型/预订/评价
class HotelService {
  final SupabaseClient _client;
  HotelService(this._client);

  // ─── 酒店搜索 ────────────────────────────────

  /// 搜索酒店（支持城市/日期/人数筛选和分页）
  Future<List<Map<String, dynamic>>> searchHotels({
    String? city,
    DateTime? checkIn,
    DateTime? checkOut,
    int? guests,
    double? minRating,
    int page = 1,
    int limit = 30,
  }) async {
    try {
      final from = (page - 1) * limit;
      var query = _client.from("hotels").select("*, room_types!inner(price,capacity)")
          .order("rating", ascending: false)
          .range(from, from + limit - 1);

      if (city != null && city.isNotEmpty) {
        query = query.or("city.ilike.%$city%,name.ilike.%$city%");
      }
      if (minRating != null) {
        query = query.gte("rating", minRating);
      }

      final rows = await query;
      return (rows as List<dynamic>).cast<Map<String, dynamic>>();
    } catch (_) {
      return [];
    }
  }

  /// 获取酒店详情（含房型列表）
  Future<Map<String, dynamic>?> getHotel(String id) async {
    try {
      final rows = await _client.from("hotels").select("*, room_types(*)")
          .eq("id", id).maybeSingle();
      return rows as Map<String, dynamic>?;
    } catch (_) {
      return null;
    }
  }

  // ─── 房型 ────────────────────────────────────

  /// 获取某酒店的房型列表（支持人数筛选）
  Future<List<Map<String, dynamic>>> getRoomTypes(
    String hotelId, {
    int? maxGuests,
    int page = 1,
    int limit = 20,
  }) async {
    try {
      final from = (page - 1) * limit;
      var query = _client.from("room_types").select("*")
          .eq("hotel_id", hotelId)
          .order("price", ascending: true)
          .range(from, from + limit - 1);
      if (maxGuests != null) query = query.lte("capacity", maxGuests);
      final rows = await query;
      return (rows as List<dynamic>).cast<Map<String, dynamic>>();
    } catch (_) {
      return [];
    }
  }

  /// 检查房型在指定日期是否可预订
  Future<bool> isRoomAvailable({
    required String roomTypeId,
    required DateTime checkIn,
    required DateTime checkOut,
  }) async {
    try {
      // 检查该房型在日期范围内是否有冲突的预订
      final conflict = await _client.from("bookings").select("id")
          .eq("room_type_id", roomTypeId)
          .neq("status", "cancelled")
          .lt("check_in", checkOut.toIso8601String())
          .gt("check_out", checkIn.toIso8601String())
          .limit(1)
          .maybeSingle();
      return conflict == null;
    } catch (_) {
      return false;
    }
  }

  // ─── 预订 ────────────────────────────────────

  /// 预订房间
  Future<Map<String, dynamic>?> bookRoom({
    required String hotelId,
    required String roomTypeId,
    required DateTime checkIn,
    required DateTime checkOut,
    int guests = 1,
    String? specialRequest,
  }) async {
    try {
      // 检查可用性
      final available = await isRoomAvailable(
        roomTypeId: roomTypeId,
        checkIn: checkIn,
        checkOut: checkOut,
      );
      if (!available) return null;

      final resp = await _client.from("bookings").insert({
        'user_id': _client.auth.currentUser!.id,
        'hotel_id': hotelId,
        'room_type_id': roomTypeId,
        'check_in': checkIn.toIso8601String(),
        'check_out': checkOut.toIso8601String(),
        'guests': guests,
        'special_request': specialRequest,
        'status': 'confirmed',
      }).select("id").single();
      return resp as Map<String, dynamic>?;
    } catch (_) {
      return null;
    }
  }

  /// 获取我的预订列表（支持分页和状态筛选）
  Future<List<Map<String, dynamic>>> getMyBookings({
    String? status,
    int page = 1,
    int limit = 20,
  }) async {
    try {
      final from = (page - 1) * limit;
      var query = _client.from("bookings")
          .select("*, hotels(name,image,city,address), room_types(name,price)")
          .eq("user_id", _client.auth.currentUser!.id)
          .order("check_in", ascending: false)
          .range(from, from + limit - 1);
      if (status != null) query = query.eq("status", status);
      final rows = await query;
      return (rows as List<dynamic>).cast<Map<String, dynamic>>();
    } catch (_) {
      return [];
    }
  }

  /// 获取预订详情
  Future<Map<String, dynamic>?> getBooking(String id) async {
    try {
      final rows = await _client.from("bookings")
          .select("*, hotels(*), room_types(*)")
          .eq("id", id).maybeSingle();
      return rows as Map<String, dynamic>?;
    } catch (_) {
      return null;
    }
  }

  /// 取消预订
  Future<bool> cancelBooking(String id) async {
    try {
      await _client.from("bookings").update({'status': 'cancelled'})
          .eq("id", id).eq("user_id", _client.auth.currentUser!.id);
      return true;
    } catch (_) {
      return false;
    }
  }

  // ─── 评价 ────────────────────────────────────

  /// 提交评价
  Future<Map<String, dynamic>?> submitReview({
    required String hotelId,
    required double rating,
    required String comment,
    String? bookingId,
  }) async {
    try {
      final resp = await _client.from("reviews").insert({
        'user_id': _client.auth.currentUser!.id,
        'hotel_id': hotelId,
        'booking_id': bookingId,
        'rating': rating,
        'comment': comment,
      }).select("id").single();
      return resp as Map<String, dynamic>?;
    } catch (_) {
      return null;
    }
  }

  /// 获取酒店评价列表
  Future<List<Map<String, dynamic>>> getReviews(
    String hotelId, {
    int page = 1,
    int limit = 20,
  }) async {
    try {
      final from = (page - 1) * limit;
      final rows = await _client.from("reviews").select("*, user_profiles(avatar_url,full_name)")
          .eq("hotel_id", hotelId)
          .order("created_at", ascending: false)
          .range(from, from + limit - 1);
      return (rows as List<dynamic>).cast<Map<String, dynamic>>();
    } catch (_) {
      return [];
    }
  }

  /// 获取我的评价列表
  Future<List<Map<String, dynamic>>> getMyReviews({int page = 1, int limit = 20}) async {
    try {
      final from = (page - 1) * limit;
      final rows = await _client.from("reviews").select("*, hotels(name,image)")
          .eq("user_id", _client.auth.currentUser!.id)
          .order("created_at", ascending: false)
          .range(from, from + limit - 1);
      return (rows as List<dynamic>).cast<Map<String, dynamic>>();
    } catch (_) {
      return [];
    }
  }

  /// 删除评价
  Future<bool> deleteReview(String id) async {
    try {
      await _client.from("reviews").delete()
          .eq("id", id).eq("user_id", _client.auth.currentUser!.id);
      return true;
    } catch (_) {
      return false;
    }
  }
}
