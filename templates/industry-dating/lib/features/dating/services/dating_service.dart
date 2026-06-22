import "package:supabase_flutter/supabase_flutter.dart";

class DatingService {
  final SupabaseClient _c; DatingService(this._c);
  Future<List<Map<String,dynamic>>> getProfiles({int limit=20}) async => ((await _c.from("user_profiles").select("*").neq("id",_c.auth.currentUser!.id).limit(limit)) as List).cast<Map<String,dynamic>>();
  Future<void> updateProfile(Map<String,dynamic> data) async => _c.from("user_profiles").upsert({...data,'id':_c.auth.currentUser!.id});
  Future<void> likeUser(String targetUserId) async {
    await _c.from("matches").insert({'user_id':_c.auth.currentUser!.id,'target_user_id':targetUserId,'status':'liked'});
    final mutual=await _c.from("matches").select("id").eq("user_id",targetUserId).eq("target_user_id",_c.auth.currentUser!.id).eq("status","liked").maybeSingle();
    if(mutual!=null) {
      await _c.from("matches").update({'status':'matched'}).eq("id",(mutual as Map)['id']);
      await _c.from("matches").update({'status':'matched'}).eq("user_id",_c.auth.currentUser!.id).eq("target_user_id",targetUserId);
    }
  }
}