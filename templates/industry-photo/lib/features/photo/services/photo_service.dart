import "dart:convert";
import "dart:typed_data";
import "package:supabase_flutter/supabase_flutter.dart";

/// 摄影/图片服务 — 作品/挑战/点赞/收藏/标签搜索
class PhotoService {
  final SupabaseClient _client;
  PhotoService(this._client);

  // ─── 作品（Photos）───────────────────────────

  /// 获取作品列表（发现页/信息流，支持分页）
  Future<List<Map<String, dynamic>>> getPhotos({
    int page = 1,
    int limit = 30,
    String? userId,
  }) async {
    try {
      final from = (page - 1) * limit;
      var query = _client.from("photos").select("*, user_profiles!inner(avatar_url,full_name)")
          .order("created_at", ascending: false)
          .range(from, from + limit - 1);
      if (userId != null) query = query.eq("user_id", userId);
      final rows = await query;
      return (rows as List<dynamic>).cast<Map<String, dynamic>>();
    } catch (_) {
      return [];
    }
  }

  /// 获取作品详情
  Future<Map<String, dynamic>?> getPhoto(String id) async {
    try {
      final rows = await _client.from("photos").select("*, user_profiles(avatar_url,full_name)")
          .eq("id", id).maybeSingle();
      return rows as Map<String, dynamic>?;
    } catch (_) {
      return null;
    }
  }

  /// 上传作品（上传图片到 Storage 并写入记录）
  Future<Map<String, dynamic>?> uploadPhoto({
    required String title,
    required String imagePath,
    String? description,
    List<String>? tags,
  }) async {
    try {
      final bytes = await _client.httpClient.get(Uri.parse(imagePath)).then((r) => r.data);
      final fileName = 'photos/${DateTime.now().millisecondsSinceEpoch}.jpg';
      await _client.storage.from("photos").upload(fileName, bytes);
      final imageUrl = _client.storage.from("photos").getPublicUrl(fileName);

      final resp = await _client.from("photos").insert({
        'user_id': _client.auth.currentUser!.id,
        'title': title,
        'description': description,
        'image_url': imageUrl,
        'tags': tags ?? [],
      }).select("id").single();
      return resp as Map<String, dynamic>?;
    } catch (_) {
      return null;
    }
  }

  /// 上传本地 Uint8List 图片数据
  Future<Map<String, dynamic>?> uploadPhotoBytes({
    required String title,
    required Uint8List bytes,
    String? description,
    List<String>? tags,
    String? extension,
  }) async {
    try {
      final ext = extension ?? 'jpg';
      final fileName = 'photos/${DateTime.now().millisecondsSinceEpoch}.$ext';
      await _client.storage.from("photos").upload(fileName, bytes);
      final imageUrl = _client.storage.from("photos").getPublicUrl(fileName);

      final resp = await _client.from("photos").insert({
        'user_id': _client.auth.currentUser!.id,
        'title': title,
        'description': description,
        'image_url': imageUrl,
        'tags': tags ?? [],
      }).select("id").single();
      return resp as Map<String, dynamic>?;
    } catch (_) {
      return null;
    }
  }

  /// 删除作品
  Future<bool> deletePhoto(String id) async {
    try {
      final photo = await getPhoto(id);
      if (photo == null) return false;

      // 提取文件名从 URL 中
      final url = photo['image_url'] as String?;
      if (url != null && url.isNotEmpty) {
        final segments = url.split('/');
        final fileName = segments.last;
        if (fileName.isNotEmpty) {
          await _client.storage.from("photos").remove([fileName]);
        }
      }

      await _client.from("photos").delete().eq("id", id);
      return true;
    } catch (_) {
      return false;
    }
  }

  // ─── 标签搜索 ────────────────────────────────

  /// 根据标签搜索作品
  Future<List<Map<String, dynamic>>> searchByTags(
    List<String> tags, {
    int page = 1,
    int limit = 30,
  }) async {
    try {
      final from = (page - 1) * limit;
      // Supabase 使用 @> 操作符查询 array contains
      final rows = await _client.from("photos")
          .select("*, user_profiles!inner(avatar_url,full_name)")
          .contains("tags", tags)
          .order("created_at", ascending: false)
          .range(from, from + limit - 1);
      return (rows as List<dynamic>).cast<Map<String, dynamic>>();
    } catch (_) {
      return [];
    }
  }

  // ─── 挑战（Challenges）────────────────────────

  /// 获取挑战列表
  Future<List<Map<String, dynamic>>> getChallenges({int page = 1, int limit = 20}) async {
    try {
      final from = (page - 1) * limit;
      final rows = await _client.from("challenges").select("*")
          .order("created_at", ascending: false)
          .range(from, from + limit - 1);
      return (rows as List<dynamic>).cast<Map<String, dynamic>>();
    } catch (_) {
      return [];
    }
  }

  /// 获取挑战详情
  Future<Map<String, dynamic>?> getChallenge(String id) async {
    try {
      final rows = await _client.from("challenges").select("*").eq("id", id).maybeSingle();
      return rows as Map<String, dynamic>?;
    } catch (_) {
      return null;
    }
  }

  /// 加入挑战
  Future<bool> joinChallenge(String challengeId, {String? photoId}) async {
    try {
      await _client.from("challenge_participants").insert({
        'user_id': _client.auth.currentUser!.id,
        'challenge_id': challengeId,
        'photo_id': photoId,
        'joined_at': DateTime.now().toIso8601String(),
      });
      return true;
    } catch (_) {
      return false;
    }
  }

  /// 获取我参与的挑战
  Future<List<Map<String, dynamic>>> getMyChallenges({int page = 1, int limit = 20}) async {
    try {
      final from = (page - 1) * limit;
      final rows = await _client.from("challenge_participants")
          .select("*, challenges(*)")
          .eq("user_id", _client.auth.currentUser!.id)
          .order("joined_at", ascending: false)
          .range(from, from + limit - 1);
      return (rows as List<dynamic>).cast<Map<String, dynamic>>();
    } catch (_) {
      return [];
    }
  }

  // ─── 点赞 ────────────────────────────────────

  /// 点赞作品
  Future<bool> likePhoto(String photoId) async {
    try {
      // 检查是否已赞
      final existing = await _client.from("likes").select("id")
          .eq("user_id", _client.auth.currentUser!.id)
          .eq("photo_id", photoId)
          .maybeSingle();
      if (existing != null) return true;
      await _client.from("likes").insert({
        'user_id': _client.auth.currentUser!.id,
        'photo_id': photoId,
      });
      // 更新作品点赞数
      await _client.rpc('increment_photo_likes', params: {'photo_id': photoId});
      return true;
    } catch (_) {
      return false;
    }
  }

  /// 取消点赞
  Future<bool> unlikePhoto(String photoId) async {
    try {
      await _client.from("likes").delete()
          .eq("user_id", _client.auth.currentUser!.id)
          .eq("photo_id", photoId);
      await _client.rpc('decrement_photo_likes', params: {'photo_id': photoId});
      return true;
    } catch (_) {
      return false;
    }
  }

  /// 检查是否已点赞
  Future<bool> isLiked(String photoId) async {
    try {
      final r = await _client.from("likes").select("id")
          .eq("user_id", _client.auth.currentUser!.id)
          .eq("photo_id", photoId)
          .maybeSingle();
      return r != null;
    } catch (_) {
      return false;
    }
  }

  // ─── 收藏（Saves）────────────────────────────

  /// 收藏作品
  Future<bool> savePhoto(String photoId) async {
    try {
      final existing = await _client.from("saves").select("id")
          .eq("user_id", _client.auth.currentUser!.id)
          .eq("photo_id", photoId)
          .maybeSingle();
      if (existing != null) return true;
      await _client.from("saves").insert({
        'user_id': _client.auth.currentUser!.id,
        'photo_id': photoId,
      });
      return true;
    } catch (_) {
      return false;
    }
  }

  /// 取消收藏
  Future<bool> unsavePhoto(String photoId) async {
    try {
      await _client.from("saves").delete()
          .eq("user_id", _client.auth.currentUser!.id)
          .eq("photo_id", photoId);
      return true;
    } catch (_) {
      return false;
    }
  }

  /// 获取收藏列表
  Future<List<Map<String, dynamic>>> getSavedPhotos({int page = 1, int limit = 30}) async {
    try {
      final from = (page - 1) * limit;
      final rows = await _client.from("saves")
          .select("*, photos(*, user_profiles(avatar_url,full_name))")
          .eq("user_id", _client.auth.currentUser!.id)
          .order("created_at", ascending: false)
          .range(from, from + limit - 1);
      return (rows as List<dynamic>).cast<Map<String, dynamic>>();
    } catch (_) {
      return [];
    }
  }
}
