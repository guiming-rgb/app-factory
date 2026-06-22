import "package:supabase_flutter/supabase_flutter.dart";

class SportsService {
  final SupabaseClient _c; SportsService(this._c);
  Future<List<Map<String,dynamic>>> getMatches({String? league,int limit=50}) async {
    var q=_c.from("matches").select("*").order("match_date",ascending:true).limit(limit);
    if(league!=null) q=q.eq("league",league);
    return ((await q) as List).cast<Map<String,dynamic>>();
  }
  Future<List<Map<String,dynamic>>> getStandings(String league) async => ((await _c.from("standings").select("*").eq("league",league).order("points",ascending:false)) as List).cast<Map<String,dynamic>>();
  Future<List<Map<String,dynamic>>> getTeams({String? league}) async {
    var q=_c.from("teams").select("*").order("name");
    if(league!=null) q=q.eq("league",league);
    return ((await q) as List).cast<Map<String,dynamic>>();
  }
}