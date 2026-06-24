import "package:supabase_flutter/supabase_flutter.dart";

/// 约会/社交服务 — 发现/匹配/兴趣/偏好
class DatingService {
  final SupabaseClient _client;
  DatingService(this._client);

  // ─── 个人资料 ────────────────────────────────

  /// 获取用户自己的个人资料
  Future<Map<String, dynamic>?> getMyProfile() async {
    try {
      final rows = await _client.from("user_profiles").select("*")
          .eq("id", _client.auth.currentUser!.id).maybeSingle();
      return rows as Map<String, dynamic>?;
    } catch (_) {
      return null;
    }
  }

  /// 创建或更新个人资料
  Future<bool> updateProfile(Map<String, dynamic> data) async {
    try {
      await _client.from("user_profiles").upsert({
        ...data,
        'id': _client.auth.currentUser!.id,
      });
      return true;
    } catch (_) {
      return false;
    }
  }

  // ─── 发现/浏览 ──────────────────────────────

  /// 发现用户（浏览卡片，支持偏好筛选和分页）
  Future<List<Map<String, dynamic>>> discoverProfiles({
    String? gender,
    int? ageMin,
    int? ageMax,
    String? city,
    int page = 1,
    int limit = 20,
  }) async {
    try {
      final from = (page - 1) * limit;
      var query = _client.from("user_profiles").select("*")
          .neq("id", _client.auth.currentUser!.id)
          .range(from, from + limit - 1);

      if (gender != null) query = query.eq("gender", gender);
      if (ageMin != null) query = query.gte("age", ageMin);
      if (ageMax != null) query = query.lte("age", ageMax);
      if (city != null) query = query.ilike("city", "%$city%");

      final rows = await query;
      return (rows as List<dynamic>).cast<Map<String, dynamic>>();
    } catch (_) {
      return [];
    }
  }

  /// 获取个人资料详情（含兴趣标签）
  Future<Map<String, dynamic>?> getProfile(String userId) async {
    try {
      final rows = await _client.from("user_profiles").select("*")
          .eq("id", userId).maybeSingle();
      return rows as Map<String, dynamic>?;
    } catch (_) {
      return null;
    }
  }

  // ─── 兴趣 ────────────────────────────────────

  /// 获取兴趣标签列表
  Future<List<Map<String, dynamic>>> getInterests() async {
    try {
      final rows = await _client.from("interests").select("*")
          .order("name", ascending: true);
      return (rows as List<dynamic>).cast<Map<String, dynamic>>();
    } catch (_) {
      return [];
    }
  }

  /// 设置用户的兴趣标签
  Future<bool> setInterests(List<String> interestIds) async {
    try {
      // 先删除旧的兴趣
      await _client.from("user_interests").delete()
          .eq("user_id", _client.auth.currentUser!.id);
      // 批量插入新兴趣
      if (interestIds.isNotEmpty) {
        final records = interestIds.map((id) => {
          'user_id': _client.auth.currentUser!.id,
          'interest_id': id,
        }).toList();
        await _client.from("user_interests").insert(records);
      }
      return true;
    } catch (_) {
      return false;
    }
  }

  /// 获取用户兴趣标签
  Future<List<Map<String, dynamic>>> getUserInterests(String? userId) async {
    try {
      final uid = userId ?? _client.auth.currentUser!.id;
      final rows = await _client.from("user_interests")
          .select("*, interests(*)")
          .eq("user_id", uid);
      return (rows as List<dynamic>).cast<Map<String, dynamic>>();
    } catch (_) {
      return [];
    }
  }

  // ─── 匹配（Likes / Matches）──────────────────

  /// 喜欢/右滑用户
  Future<bool> likeUser(String targetUserId) async {
    try {
      if (targetUserId == _client.auth.currentUser!.id) return false;

      // 插入喜欢记录
      await _client.from("matches").insert({
        'user_id': _client.auth.currentUser!.id,
        'target_user_id': targetUserId,
        'status': 'liked',
      });

      // 检查是否互相喜欢 → 触发匹配
      final mutual = await _client.from("matches").select("id")
          .eq("user_id", targetUserId)
          .eq("target_user_id", _client.auth.currentUser!.id)
          .eq("status", "liked")
          .maybeSingle();

      if (mutual != null) {
        // 双向更新为 matched
        await _client.from("matches").update({'status': 'matched'})
            .eq("user_id", targetUserId)
            .eq("target_user_id", _client.auth.currentUser!.id);
        await _client.from("matches").update({'status': 'matched'})
            .eq("user_id", _client.auth.currentUser!.id)
            .eq("target_user_id", targetUserId);
      }

      return true;
    } catch (_) {
      return false;
    }
  }

  /// 左滑/跳过用户
  Future<bool> passUser(String targetUserId) async {
    try {
      await _client.from("matches").insert({
        'user_id': _client.auth.currentUser!.id,
        'target_user_id': targetUserId,
        'status': 'passed',
      });
      return true;
    } catch (_) {
      return false;
    }
  }

  /// 获取匹配列表
  Future<List<Map<String, dynamic>>> getMatches({int page = 1, int limit = 30}) async {
    try {
      final from = (page - 1) * limit;
      final rows = await _client.from("matches")
          .select("*, user_profiles!matches_target_user_id_fkey(*)")
          .eq("user_id", _client.auth.currentUser!.id)
          .eq("status", "matched")
          .order("created_at", ascending: false)
          .range(from, from + limit - 1);
      return (rows as List<dynamic>).cast<Map<String, dynamic>>();
    } catch (_) {
      return [];
    }
  }

  /// 获取谁喜欢了我（粉丝列表）
  Future<List<Map<String, dynamic>>> getLikedMe({int page = 1, int limit = 30}) async {
    try {
      final from = (page - 1) * limit;
      final rows = await _client.from("matches")
          .select("*, user_profiles!matches_user_id_fkey(*)")
          .eq("target_user_id", _client.auth.currentUser!.id)
          .eq("status", "liked")
          .order("created_at", ascending: false)
          .range(from, from + limit - 1);
      return (rows as List<dynamic>).cast<Map<String, dynamic>>();
    } catch (_) {
      return [];
    }
  }

  /// 解除匹配
  Future<bool> unmatch(String matchId) async {
    try {
      await _client.from("matches").update({'status': 'unmatched'})
          .eq("id", matchId);
      return true;
    } catch (_) {
      return false;
    }
  }

  /// 检查是否已匹配某个用户
  Future<bool> isMatched(String targetUserId) async {
    try {
      final r = await _client.from("matches").select("id")
          .eq("user_id", _client.auth.currentUser!.id)
          .eq("target_user_id", targetUserId)
          .eq("status", "matched")
          .maybeSingle();
      return r != null;
    } catch (_) {
      return false;
    }
  }
}
