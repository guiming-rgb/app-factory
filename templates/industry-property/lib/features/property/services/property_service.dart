import "package:supabase_flutter/supabase_flutter.dart";

class PropertyService {
  final SupabaseClient _c; PropertyService(this._c);
  Future<void> submitRepair({required String title,required String description,String? image}) async {
    await _c.from("repairs").insert({'user_id':_c.auth.currentUser!.id,'title':title,'description':description,'image':image,'status':'pending'});
  }
  Future<List<Map<String,dynamic>>> getMyRepairs() async => ((await _c.from("repairs").select("*").eq("user_id",_c.auth.currentUser!.id).order("created_at",ascending:false)) as List).cast<Map<String,dynamic>>();
  Future<List<Map<String,dynamic>>> getNotices({int limit=20}) async => ((await _c.from("notices").select("*").order("created_at",ascending:false).limit(limit)) as List).cast<Map<String,dynamic>>();
}