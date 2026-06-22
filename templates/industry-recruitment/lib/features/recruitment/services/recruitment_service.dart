import "package:supabase_flutter/supabase_flutter.dart";

class RecruitmentService {
  final SupabaseClient _c; RecruitmentService(this._c);
  Future<List<Map<String,dynamic>>> getJobs({String? search,int limit=30}) async {
    var q=_c.from("jobs").select("*").order("created_at",ascending:false).limit(limit);
    if(search!=null) q=q.or("title.ilike.%$search%,company.ilike.%$search%");
    return ((await q) as List).cast<Map<String,dynamic>>();
  }
  Future<void> apply({required String jobId,String? resume}) async {
    await _c.from("applications").insert({'user_id':_c.auth.currentUser!.id,'job_id':jobId,'resume':resume,'status':'pending'});
  }
  Future<List<Map<String,dynamic>>> getMyApplications() async => ((await _c.from("applications").select("*,jobs(title,company)").eq("user_id",_c.auth.currentUser!.id).order("created_at",ascending:false)) as List).cast<Map<String,dynamic>>();
}