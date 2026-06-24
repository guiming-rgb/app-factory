import "package:supabase_flutter/supabase_flutter.dart";

/// 视频服务 — 视频浏览、分类/搜索、收藏、观看历史、继续观看
class VideoService {
  final SupabaseClient _client;
  VideoService(this._client);

  // ─── 视频浏览 ────────────────────────────────

  /// 获取视频列表，支持分类筛选、搜索、分页
  Future<List<Map<String, dynamic>>> getVideos({
    String? category,
    String? search,
    int page = 1,
    int limit = 20,
  }) async {
    try {
      var query = _client
          .from("videos")
          .select("*, category:category_id(*)")
          .order("created_at", ascending: false)
          .range((page - 1) * limit, page * limit - 1);
      if (category != null && category.isNotEmpty) {
        query = query.eq("category", category);
      }
      if (search != null && search.isNotEmpty) {
        query = query.ilike("title", "%$search%");
      }
      final rows = await query;
      return (rows as List<dynamic>).cast<Map<String, dynamic>>();
    } catch (_) {
      return [];
    }
  }

  /// 获取热门/趋势视频
  Future<List<Map<String, dynamic>>> getTrendingVideos({int limit = 20}) async {
    try {
      final rows = await _client
          .from("videos")
          .select("*, category:category_id(*)")
          .order("views", ascending: false)
          .limit(limit);
      return (rows as List<dynamic>).cast<Map<String, dynamic>>();
    } catch (_) {
      return [];
    }
  }

  /// 获取某个分类下的视频
  Future<List<Map<String, dynamic>>> getVideosByCategory(
    String categoryId, {
    int page = 1,
    int limit = 20,
  }) async {
    try {
      final rows = await _client
          .from("videos")
          .select("*, category:category_id(*)")
          .eq("category_id", categoryId)
          .order("created_at", ascending: false)
          .range((page - 1) * limit, page * limit - 1);
      return (rows as List<dynamic>).cast<Map<String, dynamic>>();
    } catch (_) {
      return [];
    }
  }

  /// 获取单条视频详情（含相关信息）
  Future<Map<String, dynamic>?> getVideoDetail(String videoId) async {
    try {
      final rows = await _client
          .from("videos")
          .select("*, category:category_id(*), related_videos(*)")
          .eq("id", videoId)
          .single();
      return rows as Map<String, dynamic>?;
    } catch (_) {
      return null;
    }
  }

  /// 视频搜索
  Future<List<Map<String, dynamic>>> searchVideos(
    String query, {
    int page = 1,
    int limit = 20,
  }) async {
    try {
      final rows = await _client
          .from("videos")
          .select("*, category:category_id(*)")
          .or("title.ilike.%$query%,description.ilike.%$query%")
          .order("created_at", ascending: false)
          .range((page - 1) * limit, page * limit - 1);
      return (rows as List<dynamic>).cast<Map<String, dynamic>>();
    } catch (_) {
      return [];
    }
  }

  // ─── 收藏 ────────────────────────────────────

  /// 添加到收藏
  Future<bool> addToFavorites(String videoId) async {
    try {
      final uid = _client.auth.currentUser?.id;
      if (uid == null) return false;
      await _client.from("favorites").insert({
        'user_id': uid,
        'video_id': videoId,
      });
      return true;
    } catch (_) {
      return false;
    }
  }

  /// 取消收藏
  Future<bool> removeFromFavorites(String videoId) async {
    try {
      final uid = _client.auth.currentUser?.id;
      if (uid == null) return false;
      await _client
          .from("favorites")
          .delete()
          .eq("user_id", uid)
          .eq("video_id", videoId);
      return true;
    } catch (_) {
      return false;
    }
  }

  /// 获取收藏列表
  Future<List<Map<String, dynamic>>> getFavorites({int page = 1, int limit = 20}) async {
    try {
      final uid = _client.auth.currentUser?.id;
      if (uid == null) return [];
      final rows = await _client
          .from("favorites")
          .select("*, video:video_id(*)")
          .eq("user_id", uid)
          .order("created_at", ascending: false)
          .range((page - 1) * limit, page * limit - 1);
      return (rows as List<dynamic>).cast<Map<String, dynamic>>();
    } catch (_) {
      return [];
    }
  }

  /// 检查视频是否已被收藏
  Future<bool> isFavorite(String videoId) async {
    try {
      final uid = _client.auth.currentUser?.id;
      if (uid == null) return false;
      final r = await _client
          .from("favorites")
          .select("id")
          .eq("user_id", uid)
          .eq("video_id", videoId)
          .maybeSingle();
      return r != null;
    } catch (_) {
      return false;
    }
  }

  // ─── 观看历史 ────────────────────────────────

  /// 记录观看进度
  Future<bool> updateWatchProgress(
    String videoId, {
    required int currentTime,
    required int totalDuration,
  }) async {
    try {
      final uid = _client.auth.currentUser?.id;
      if (uid == null) return false;
      final fraction = totalDuration > 0 ? currentTime / totalDuration : 0.0;
      await _client.from("watch_history").upsert({
        'user_id': uid,
        'video_id': videoId,
        'current_time': currentTime,
        'total_duration': totalDuration,
        'progress': (fraction * 100).round(),
        'watched_at': DateTime.now().toIso8601String(),
      });
      return true;
    } catch (_) {
      return false;
    }
  }

  /// 获取观看历史
  Future<List<Map<String, dynamic>>> getWatchHistory({int limit = 30}) async {
    try {
      final uid = _client.auth.currentUser?.id;
      if (uid == null) return [];
      final rows = await _client
          .from("watch_history")
          .select("*, video:video_id(*)")
          .eq("user_id", uid)
          .order("watched_at", ascending: false)
          .limit(limit);
      return (rows as List<dynamic>).cast<Map<String, dynamic>>();
    } catch (_) {
      return [];
    }
  }

  /// 清除观看历史
  Future<bool> clearWatchHistory() async {
    try {
      final uid = _client.auth.currentUser?.id;
      if (uid == null) return false;
      await _client
          .from("watch_history")
          .delete()
          .eq("user_id", uid);
      return true;
    } catch (_) {
      return false;
    }
  }

  // ─── 继续观看 ────────────────────────────────

  /// 获取可继续观看的视频（有进度但未看完）
  Future<List<Map<String, dynamic>>> getContinueWatching({int limit = 10}) async {
    try {
      final uid = _client.auth.currentUser?.id;
      if (uid == null) return [];
      final rows = await _client
          .from("watch_history")
          .select("*, video:video_id(*)")
          .eq("user_id", uid)
          .lt("progress", 95)
          .gt("progress", 0)
          .order("watched_at", ascending: false)
          .limit(limit);
      return (rows as List<dynamic>).cast<Map<String, dynamic>>();
    } catch (_) {
      return [];
    }
  }

  // ─── 分类 ────────────────────────────────────

  /// 获取视频分类列表
  Future<List<Map<String, dynamic>>> getCategories() async {
    try {
      final rows = await _client
          .from("video_categories")
          .select("*")
          .order("name");
      return (rows as List<dynamic>).cast<Map<String, dynamic>>();
    } catch (_) {
      return [];
    }
  }
}
