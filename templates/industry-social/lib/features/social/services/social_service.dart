import "package:supabase_flutter/supabase_flutter.dart";

/// 社交服务 — 动态/帖子的 Feed、点赞评论、话题、关注、私信
class SocialService {
  final SupabaseClient _client;
  SocialService(this._client);

  // ─── 动态 / 帖子 ────────────────────────────

  /// 获取 Feed 流（含发布者信息、点赞数、评论数）
  Future<List<Map<String, dynamic>>> getFeed({
    int page = 1,
    int limit = 20,
  }) async {
    try {
      final rows = await _client
          .from("posts")
          .select("*, user:user_id(*), likes(count), comments(count)")
          .order("created_at", ascending: false)
          .range((page - 1) * limit, page * limit - 1);
      return (rows as List<dynamic>).cast<Map<String, dynamic>>();
    } catch (_) {
      return [];
    }
  }

  /// 创建帖子
  Future<Map<String, dynamic>?> createPost({
    required String content,
    String? images,
    int? topicId,
  }) async {
    try {
      final uid = _client.auth.currentUser?.id;
      if (uid == null) return null;
      final rows = await _client
          .from("posts")
          .insert({
            'user_id': uid,
            'content': content,
            'images': images,
            'topic_id': topicId,
          })
          .select("*, user:user_id(*)")
          .single();
      return rows as Map<String, dynamic>?;
    } catch (_) {
      return null;
    }
  }

  /// 删除帖子
  Future<bool> deletePost(String postId) async {
    try {
      final uid = _client.auth.currentUser?.id;
      if (uid == null) return false;
      await _client
          .from("posts")
          .delete()
          .eq("id", postId)
          .eq("user_id", uid);
      return true;
    } catch (_) {
      return false;
    }
  }

  /// 获取单条帖子详情
  Future<Map<String, dynamic>?> getPostDetail(String postId) async {
    try {
      final rows = await _client
          .from("posts")
          .select("*, user:user_id(*), likes(count), comments(*, user:user_id(*))")
          .eq("id", postId)
          .single();
      return rows as Map<String, dynamic>?;
    } catch (_) {
      return null;
    }
  }

  // ─── 点赞 ────────────────────────────────────

  /// 切换点赞状态
  Future<bool> toggleLike(String postId) async {
    try {
      final uid = _client.auth.currentUser?.id;
      if (uid == null) return false;
      await _client.rpc("toggle_like", params: {
        'p_post_id': postId,
        'p_user_id': uid,
      });
      return true;
    } catch (_) {
      return false;
    }
  }

  /// 检查是否已点赞
  Future<bool> isLiked(String postId) async {
    try {
      final uid = _client.auth.currentUser?.id;
      if (uid == null) return false;
      final r = await _client
          .from("likes")
          .select("id")
          .eq("user_id", uid)
          .eq("post_id", postId)
          .maybeSingle();
      return r != null;
    } catch (_) {
      return false;
    }
  }

  // ─── 评论 ────────────────────────────────────

  /// 发表评论
  Future<Map<String, dynamic>?> addComment({
    required String postId,
    required String content,
  }) async {
    try {
      final uid = _client.auth.currentUser?.id;
      if (uid == null) return null;
      final rows = await _client
          .from("comments")
          .insert({
            'user_id': uid,
            'post_id': postId,
            'content': content,
          })
          .select("*, user:user_id(*)")
          .single();
      return rows as Map<String, dynamic>?;
    } catch (_) {
      return null;
    }
  }

  /// 删除评论
  Future<bool> deleteComment(String commentId) async {
    try {
      final uid = _client.auth.currentUser?.id;
      if (uid == null) return false;
      await _client
          .from("comments")
          .delete()
          .eq("id", commentId)
          .eq("user_id", uid);
      return true;
    } catch (_) {
      return false;
    }
  }

  /// 获取帖子的评论列表
  Future<List<Map<String, dynamic>>> getComments(
    String postId, {
    int page = 1,
    int limit = 50,
  }) async {
    try {
      final rows = await _client
          .from("comments")
          .select("*, user:user_id(*)")
          .eq("post_id", postId)
          .order("created_at", ascending: true)
          .range((page - 1) * limit, page * limit - 1);
      return (rows as List<dynamic>).cast<Map<String, dynamic>>();
    } catch (_) {
      return [];
    }
  }

  // ─── 话题 ────────────────────────────────────

  /// 获取热门/趋势话题
  Future<List<Map<String, dynamic>>> getTrendingTopics({int limit = 10}) async {
    try {
      final rows = await _client
          .from("topics")
          .select("*, posts(count)")
          .order("posts_count", ascending: false)
          .limit(limit);
      return (rows as List<dynamic>).cast<Map<String, dynamic>>();
    } catch (_) {
      return [];
    }
  }

  /// 获取所有话题
  Future<List<Map<String, dynamic>>> getTopics({String? search, int limit = 30}) async {
    try {
      var query = _client
          .from("topics")
          .select("*")
          .order("name")
          .limit(limit);
      if (search != null && search.isNotEmpty) {
        query = query.ilike("name", "%$search%");
      }
      final rows = await query;
      return (rows as List<dynamic>).cast<Map<String, dynamic>>();
    } catch (_) {
      return [];
    }
  }

  // ─── 关注 ────────────────────────────────────

  /// 关注 / 取消关注用户
  Future<bool> toggleFollow(String targetUserId) async {
    try {
      final uid = _client.auth.currentUser?.id;
      if (uid == null || uid == targetUserId) return false;
      final exists = await _client
          .from("follows")
          .select("id")
          .eq("follower_id", uid)
          .eq("following_id", targetUserId)
          .maybeSingle();
      if (exists != null) {
        await _client
            .from("follows")
            .delete()
            .eq("id", (exists as Map)['id']);
      } else {
        await _client
            .from("follows")
            .insert({'follower_id': uid, 'following_id': targetUserId});
      }
      return true;
    } catch (_) {
      return false;
    }
  }

  /// 检查是否已关注
  Future<bool> isFollowing(String targetUserId) async {
    try {
      final uid = _client.auth.currentUser?.id;
      if (uid == null) return false;
      final r = await _client
          .from("follows")
          .select("id")
          .eq("follower_id", uid)
          .eq("following_id", targetUserId)
          .maybeSingle();
      return r != null;
    } catch (_) {
      return false;
    }
  }

  /// 获取关注列表
  Future<List<Map<String, dynamic>>> getFollowing({int limit = 50}) async {
    try {
      final uid = _client.auth.currentUser?.id;
      if (uid == null) return [];
      final rows = await _client
          .from("follows")
          .select("*, following:following_id(*)")
          .eq("follower_id", uid)
          .limit(limit);
      return (rows as List<dynamic>).cast<Map<String, dynamic>>();
    } catch (_) {
      return [];
    }
  }

  /// 获取粉丝列表
  Future<List<Map<String, dynamic>>> getFollowers({int limit = 50}) async {
    try {
      final uid = _client.auth.currentUser?.id;
      if (uid == null) return [];
      final rows = await _client
          .from("follows")
          .select("*, follower:follower_id(*)")
          .eq("following_id", uid)
          .limit(limit);
      return (rows as List<dynamic>).cast<Map<String, dynamic>>();
    } catch (_) {
      return [];
    }
  }

  // ─── 私信 ────────────────────────────────────

  /// 发送私信
  Future<Map<String, dynamic>?> sendMessage({
    required String receiverId,
    required String content,
  }) async {
    try {
      final uid = _client.auth.currentUser?.id;
      if (uid == null) return null;
      final rows = await _client
          .from("messages")
          .insert({
            'sender_id': uid,
            'receiver_id': receiverId,
            'content': content,
          })
          .select("*, sender:sender_id(*), receiver:receiver_id(*)")
          .single();
      return rows as Map<String, dynamic>?;
    } catch (_) {
      return null;
    }
  }

  /// 获取与某用户的聊天记录
  Future<List<Map<String, dynamic>>> getConversation(
    String otherUserId, {
    int page = 1,
    int limit = 50,
  }) async {
    try {
      final uid = _client.auth.currentUser?.id;
      if (uid == null) return [];
      final rows = await _client
          .from("messages")
          .select("*, sender:sender_id(*), receiver:receiver_id(*)")
          .or(
            "and(sender_id.eq.$uid,receiver_id.eq.$otherUserId),"
            "and(sender_id.eq.$otherUserId,receiver_id.eq.$uid)")
          .order("created_at", ascending: false)
          .range((page - 1) * limit, page * limit - 1);
      return (rows as List<dynamic>).cast<Map<String, dynamic>>();
    } catch (_) {
      return [];
    }
  }

  /// 获取最近聊天列表（收件箱）
  Future<List<Map<String, dynamic>>> getConversations({int limit = 20}) async {
    try {
      final uid = _client.auth.currentUser?.id;
      if (uid == null) return [];
      // 获取用户参与的所有消息，按联系人分组取最新一条
      final rows = await _client
          .rpc("get_recent_conversations", params: {'p_user_id': uid})
          .select("*, sender:sender_id(*), receiver:receiver_id(*)")
          .limit(limit);
      return (rows as List<dynamic>).cast<Map<String, dynamic>>();
    } catch (_) {
      return [];
    }
  }

  /// 标记消息为已读
  Future<bool> markAsRead(String messageId) async {
    try {
      await _client
          .from("messages")
          .update({'is_read': true})
          .eq("id", messageId);
      return true;
    } catch (_) {
      return false;
    }
  }
}
