import "package:supabase_flutter/supabase_flutter.dart";

/// 博客服务 — 文章浏览、分类搜索、书签管理、作者信息
class BlogService {
  final SupabaseClient _client;
  BlogService(this._client);

  // ─── 文章 CRUD ──────────────────────────────

  /// 获取文章列表，支持分页、分类筛选、搜索
  Future<List<Map<String, dynamic>>> getArticles({
    String? categoryId,
    String? search,
    int page = 1,
    int limit = 20,
  }) async {
    try {
      var query = _client
          .from("articles")
          .select("*, categories(name), author:author_id(*)")
          .order("created_at", ascending: false)
          .range((page - 1) * limit, page * limit - 1);
      if (categoryId != null && categoryId.isNotEmpty) {
        query = query.eq("category_id", categoryId);
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

  /// 根据 ID 获取单篇文章详情
  Future<Map<String, dynamic>?> getArticle(String id) async {
    try {
      final rows = await _client
          .from("articles")
          .select("*, categories(name), author:author_id(*)")
          .eq("id", id)
          .single();
      return rows as Map<String, dynamic>?;
    } catch (_) {
      return null;
    }
  }

  /// 创建文章（管理员用）
  Future<Map<String, dynamic>?> createArticle({
    required String title,
    required String content,
    String? summary,
    String? coverImage,
    required String categoryId,
    required String authorId,
    List<String>? tags,
  }) async {
    try {
      final rows = await _client
          .from("articles")
          .insert({
            'title': title,
            'content': content,
            'summary': summary,
            'cover_image': coverImage,
            'category_id': categoryId,
            'author_id': authorId,
            'tags': tags,
          })
          .select()
          .single();
      return rows as Map<String, dynamic>?;
    } catch (_) {
      return null;
    }
  }

  /// 更新文章
  Future<Map<String, dynamic>?> updateArticle(
    String id, {
    String? title,
    String? content,
    String? summary,
    String? coverImage,
    String? categoryId,
    List<String>? tags,
  }) async {
    try {
      final updates = <String, dynamic>{};
      if (title != null) updates['title'] = title;
      if (content != null) updates['content'] = content;
      if (summary != null) updates['summary'] = summary;
      if (coverImage != null) updates['cover_image'] = coverImage;
      if (categoryId != null) updates['category_id'] = categoryId;
      if (tags != null) updates['tags'] = tags;
      updates['updated_at'] = DateTime.now().toIso8601String();

      final rows = await _client
          .from("articles")
          .update(updates)
          .eq("id", id)
          .select()
          .single();
      return rows as Map<String, dynamic>?;
    } catch (_) {
      return null;
    }
  }

  /// 删除文章
  Future<bool> deleteArticle(String id) async {
    try {
      await _client.from("articles").delete().eq("id", id);
      return true;
    } catch (_) {
      return false;
    }
  }

  // ─── 收藏 / 书签 ────────────────────────────

  /// 切换文章收藏状态（有则删，无则加）
  Future<bool> toggleBookmark(String articleId) async {
    try {
      final uid = _client.auth.currentUser?.id;
      if (uid == null) return false;
      final exists = await _client
          .from("bookmarks")
          .select("id")
          .eq("user_id", uid)
          .eq("article_id", articleId)
          .maybeSingle();
      if (exists != null) {
        await _client
            .from("bookmarks")
            .delete()
            .eq("id", (exists as Map)['id']);
      } else {
        await _client
            .from("bookmarks")
            .insert({'user_id': uid, 'article_id': articleId});
      }
      return true;
    } catch (_) {
      return false;
    }
  }

  /// 获取当前用户的收藏列表
  Future<List<Map<String, dynamic>>> getBookmarks({int limit = 20}) async {
    try {
      final uid = _client.auth.currentUser?.id;
      if (uid == null) return [];
      final rows = await _client
          .from("bookmarks")
          .select("*, articles(*, categories(name), author:author_id(*))")
          .eq("user_id", uid)
          .order("created_at", ascending: false)
          .limit(limit);
      return (rows as List<dynamic>).cast<Map<String, dynamic>>();
    } catch (_) {
      return [];
    }
  }

  /// 检查某篇文章是否已被当前用户收藏
  Future<bool> isBookmarked(String articleId) async {
    try {
      final uid = _client.auth.currentUser?.id;
      if (uid == null) return false;
      final r = await _client
          .from("bookmarks")
          .select("id")
          .eq("user_id", uid)
          .eq("article_id", articleId)
          .maybeSingle();
      return r != null;
    } catch (_) {
      return false;
    }
  }

  // ─── 分类 ────────────────────────────────────

  /// 获取所有分类
  Future<List<Map<String, dynamic>>> getCategories() async {
    try {
      final rows = await _client
          .from("categories")
          .select("*")
          .order("name");
      return (rows as List<dynamic>).cast<Map<String, dynamic>>();
    } catch (_) {
      return [];
    }
  }

  /// 获取每个分类下的文章数
  Future<List<Map<String, dynamic>>> getCategoriesWithCount() async {
    try {
      final rows = await _client
          .from("categories")
          .select("*, articles(count)")
          .order("name");
      return (rows as List<dynamic>).cast<Map<String, dynamic>>();
    } catch (_) {
      return [];
    }
  }

  // ─── 作者 ────────────────────────────────────

  /// 获取作者信息
  Future<Map<String, dynamic>?> getAuthorInfo(String authorId) async {
    try {
      final rows = await _client
          .from("authors")
          .select("*")
          .eq("id", authorId)
          .single();
      return rows as Map<String, dynamic>?;
    } catch (_) {
      return null;
    }
  }

  /// 获取某作者的文章列表
  Future<List<Map<String, dynamic>>> getArticlesByAuthor(
    String authorId, {
    int page = 1,
    int limit = 20,
  }) async {
    try {
      final rows = await _client
          .from("articles")
          .select("*, categories(name)")
          .eq("author_id", authorId)
          .order("created_at", ascending: false)
          .range((page - 1) * limit, page * limit - 1);
      return (rows as List<dynamic>).cast<Map<String, dynamic>>();
    } catch (_) {
      return [];
    }
  }

  /// 获取文章总数（可用于分页计算）
  Future<int> getArticleCount({String? categoryId}) async {
    try {
      var query = _client.from("articles").select("id", const FetchOptions(count: ExactCount.count));
      if (categoryId != null && categoryId.isNotEmpty) {
        query = query.eq("category_id", categoryId);
      }
      final r = await query;
      return r.length;
    } catch (_) {
      return 0;
    }
  }

  /// 点赞 / 取消点赞
  Future<bool> toggleLike(String articleId) async {
    try {
      final uid = _client.auth.currentUser?.id;
      if (uid == null) return false;
      final exists = await _client
          .from("article_likes")
          .select("id")
          .eq("user_id", uid)
          .eq("article_id", articleId)
          .maybeSingle();
      if (exists != null) {
        await _client
            .from("article_likes")
            .delete()
            .eq("id", (exists as Map)['id']);
      } else {
        await _client
            .from("article_likes")
            .insert({'user_id': uid, 'article_id': articleId});
      }
      return true;
    } catch (_) {
      return false;
    }
  }
}
