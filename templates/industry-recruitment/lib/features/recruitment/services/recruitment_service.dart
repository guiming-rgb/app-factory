import "package:supabase_flutter/supabase_flutter.dart";

/// 招聘服务 — 职位/公司/投递管理
class RecruitmentService {
  final SupabaseClient _client;
  RecruitmentService(this._client);

  // ─── 职位 ────────────────────────────────────

  /// 获取职位列表（支持搜索、薪资/地点筛选、分页）
  Future<List<Map<String, dynamic>>> getJobs({
    String? search,
    String? location,
    double? minSalary,
    double? maxSalary,
    int page = 1,
    int limit = 30,
  }) async {
    try {
      final from = (page - 1) * limit;
      var query = _client.from("jobs").select("*, companies(name,logo,city)")
          .order("created_at", ascending: false)
          .range(from, from + limit - 1);

      if (search != null && search.isNotEmpty) {
        query = query.or(
          "title.ilike.%$search%,company_name.ilike.%$search%,description.ilike.%$search%",
        );
      }
      if (location != null) {
        query = query.ilike("location", "%$location%");
      }
      if (minSalary != null) {
        query = query.gte("salary_min", minSalary);
      }
      if (maxSalary != null) {
        query = query.lte("salary_max", maxSalary);
      }

      final rows = await query;
      return (rows as List<dynamic>).cast<Map<String, dynamic>>();
    } catch (_) {
      return [];
    }
  }

  /// 获取职位详情
  Future<Map<String, dynamic>?> getJob(String id) async {
    try {
      final rows = await _client.from("jobs").select("*, companies(*)")
          .eq("id", id).maybeSingle();
      return rows as Map<String, dynamic>?;
    } catch (_) {
      return null;
    }
  }

  // ─── 公司 ────────────────────────────────────

  /// 获取公司列表
  Future<List<Map<String, dynamic>>> getCompanies({int page = 1, int limit = 20}) async {
    try {
      final from = (page - 1) * limit;
      final rows = await _client.from("companies").select("*, jobs(count)")
          .order("name", ascending: true)
          .range(from, from + limit - 1);
      return (rows as List<dynamic>).cast<Map<String, dynamic>>();
    } catch (_) {
      return [];
    }
  }

  /// 获取公司详情（含招聘职位）
  Future<Map<String, dynamic>?> getCompany(String id) async {
    try {
      final rows = await _client.from("companies").select("*").eq("id", id).maybeSingle();
      return rows as Map<String, dynamic>?;
    } catch (_) {
      return null;
    }
  }

  /// 获取某公司的全部职位
  Future<List<Map<String, dynamic>>> getCompanyJobs(
    String companyId, {
    int page = 1,
    int limit = 30,
  }) async {
    try {
      final from = (page - 1) * limit;
      final rows = await _client.from("jobs").select("*")
          .eq("company_id", companyId)
          .order("created_at", ascending: false)
          .range(from, from + limit - 1);
      return (rows as List<dynamic>).cast<Map<String, dynamic>>();
    } catch (_) {
      return [];
    }
  }

  // ─── 投递（Applications）─────────────────────

  /// 投递简历
  Future<Map<String, dynamic>?> apply({
    required String jobId,
    String? resume,
    String? coverLetter,
  }) async {
    try {
      // 检查是否已投递
      final existing = await _client.from("applications").select("id")
          .eq("user_id", _client.auth.currentUser!.id)
          .eq("job_id", jobId)
          .maybeSingle();
      if (existing != null) return null;

      final resp = await _client.from("applications").insert({
        'user_id': _client.auth.currentUser!.id,
        'job_id': jobId,
        'resume': resume,
        'cover_letter': coverLetter,
        'status': 'pending',
      }).select("id").single();
      return resp as Map<String, dynamic>?;
    } catch (_) {
      return null;
    }
  }

  /// 获取我的投递列表（支持分页和状态筛选）
  Future<List<Map<String, dynamic>>> getMyApplications({
    String? status,
    int page = 1,
    int limit = 20,
  }) async {
    try {
      final from = (page - 1) * limit;
      var query = _client.from("applications")
          .select("*, jobs!inner(title,company_name,salary_min,salary_max), companies(name,logo)")
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

  /// 获取投递详情
  Future<Map<String, dynamic>?> getApplication(String id) async {
    try {
      final rows = await _client.from("applications")
          .select("*, jobs(*), companies(*)")
          .eq("id", id).maybeSingle();
      return rows as Map<String, dynamic>?;
    } catch (_) {
      return null;
    }
  }

  /// 更新投递状态（仅对自己投递的记录可用）
  Future<bool> updateApplicationStatus(String id, String status) async {
    try {
      await _client.from("applications").update({'status': status})
          .eq("id", id).eq("user_id", _client.auth.currentUser!.id);
      return true;
    } catch (_) {
      return false;
    }
  }

  /// 撤回投递
  Future<bool> withdrawApplication(String id) async {
    try {
      await _client.from("applications").delete()
          .eq("id", id).eq("user_id", _client.auth.currentUser!.id);
      return true;
    } catch (_) {
      return false;
    }
  }

  // ─── 搜索建议 ────────────────────────────────

  /// 获取热门职位搜索建议
  Future<List<String>> getSearchSuggestions(String query) async {
    try {
      final rows = await _client.from("jobs").select("title")
          .ilike("title", "%$query%")
          .limit(10);
      final titles = (rows as List<dynamic>)
          .map((r) => (r as Map)['title'] as String)
          .toSet()
          .toList();
      return titles;
    } catch (_) {
      return [];
    }
  }
}
