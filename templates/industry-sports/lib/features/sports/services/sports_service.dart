import "package:supabase_flutter/supabase_flutter.dart";

/// 体育服务 — 赛事、积分榜、球队信息、体育新闻
class SportsService {
  final SupabaseClient _client;
  SportsService(this._client);

  // ─── 赛事 ────────────────────────────────────

  /// 获取进行中的直播比赛
  Future<List<Map<String, dynamic>>> getLiveMatches({int limit = 50}) async {
    try {
      final rows = await _client
          .from("matches")
          .select("*, home_team:home_team_id(*), away_team:away_team_id(*)")
          .eq("status", "live")
          .order("match_date", ascending: false)
          .limit(limit);
      return (rows as List<dynamic>).cast<Map<String, dynamic>>();
    } catch (_) {
      return [];
    }
  }

  /// 获取即将到来的比赛
  Future<List<Map<String, dynamic>>> getUpcomingMatches({
    String? league,
    int page = 1,
    int limit = 20,
  }) async {
    try {
      var query = _client
          .from("matches")
          .select("*, home_team:home_team_id(*), away_team:away_team_id(*)")
          .eq("status", "upcoming")
          .order("match_date", ascending: true)
          .range((page - 1) * limit, page * limit - 1);
      if (league != null && league.isNotEmpty) {
        query = query.eq("league", league);
      }
      final rows = await query;
      return (rows as List<dynamic>).cast<Map<String, dynamic>>();
    } catch (_) {
      return [];
    }
  }

  /// 获取已结束的比赛
  Future<List<Map<String, dynamic>>> getPastMatches({
    String? league,
    int page = 1,
    int limit = 20,
  }) async {
    try {
      var query = _client
          .from("matches")
          .select("*, home_team:home_team_id(*), away_team:away_team_id(*)")
          .eq("status", "finished")
          .order("match_date", ascending: false)
          .range((page - 1) * limit, page * limit - 1);
      if (league != null && league.isNotEmpty) {
        query = query.eq("league", league);
      }
      final rows = await query;
      return (rows as List<dynamic>).cast<Map<String, dynamic>>();
    } catch (_) {
      return [];
    }
  }

  /// 搜索比赛（按球队名称或联赛）
  Future<List<Map<String, dynamic>>> searchMatches(
    String query, {
    int page = 1,
    int limit = 20,
  }) async {
    try {
      final rows = await _client
          .from("matches")
          .select("*, home_team:home_team_id(*), away_team:away_team_id(*)")
          .or("home_team_name.ilike.%$query%,away_team_name.ilike.%$query%,league.ilike.%$query%")
          .order("match_date", ascending: false)
          .range((page - 1) * limit, page * limit - 1);
      return (rows as List<dynamic>).cast<Map<String, dynamic>>();
    } catch (_) {
      return [];
    }
  }

  /// 获取单场比赛详情
  Future<Map<String, dynamic>?> getMatchDetail(String matchId) async {
    try {
      final rows = await _client
          .from("matches")
          .select("*, home_team:home_team_id(*), away_team:away_team_id(*), events(*)")
          .eq("id", matchId)
          .single();
      return rows as Map<String, dynamic>?;
    } catch (_) {
      return null;
    }
  }

  // ─── 积分榜 ──────────────────────────────────

  /// 获取指定联赛的积分榜
  Future<List<Map<String, dynamic>>> getStandings(String league) async {
    try {
      final rows = await _client
          .from("standings")
          .select("*, team:team_id(*)")
          .eq("league", league)
          .order("points", ascending: false);
      return (rows as List<dynamic>).cast<Map<String, dynamic>>();
    } catch (_) {
      return [];
    }
  }

  // ─── 球队 ────────────────────────────────────

  /// 获取球队列表
  Future<List<Map<String, dynamic>>> getTeams({String? league}) async {
    try {
      var query = _client
          .from("teams")
          .select("*")
          .order("name");
      if (league != null && league.isNotEmpty) {
        query = query.eq("league", league);
      }
      final rows = await query;
      return (rows as List<dynamic>).cast<Map<String, dynamic>>();
    } catch (_) {
      return [];
    }
  }

  /// 获取球队详情（含球员、赛程等）
  Future<Map<String, dynamic>?> getTeamDetail(String teamId) async {
    try {
      final rows = await _client
          .from("teams")
          .select("*, players(*)")
          .eq("id", teamId)
          .single();
      return rows as Map<String, dynamic>?;
    } catch (_) {
      return null;
    }
  }

  // ─── 新闻 ────────────────────────────────────

  /// 获取体育新闻列表
  Future<List<Map<String, dynamic>>> getNews({
    String? league,
    int page = 1,
    int limit = 20,
  }) async {
    try {
      var query = _client
          .from("sports_news")
          .select("*")
          .order("published_at", ascending: false)
          .range((page - 1) * limit, page * limit - 1);
      if (league != null && league.isNotEmpty) {
        query = query.eq("league", league);
      }
      final rows = await query;
      return (rows as List<dynamic>).cast<Map<String, dynamic>>();
    } catch (_) {
      return [];
    }
  }

  /// 搜索体育新闻
  Future<List<Map<String, dynamic>>> searchNews(
    String query, {
    int page = 1,
    int limit = 20,
  }) async {
    try {
      final rows = await _client
          .from("sports_news")
          .select("*")
          .or("title.ilike.%$query%,content.ilike.%$query%")
          .order("published_at", ascending: false)
          .range((page - 1) * limit, page * limit - 1);
      return (rows as List<dynamic>).cast<Map<String, dynamic>>();
    } catch (_) {
      return [];
    }
  }

  /// 获取单条新闻详情
  Future<Map<String, dynamic>?> getNewsDetail(String newsId) async {
    try {
      final rows = await _client
          .from("sports_news")
          .select("*")
          .eq("id", newsId)
          .single();
      return rows as Map<String, dynamic>?;
    } catch (_) {
      return null;
    }
  }
}
