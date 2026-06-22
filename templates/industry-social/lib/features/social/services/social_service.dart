import "package:supabase_flutter/supabase_flutter.dart";

class SocialService {
  final SupabaseClient _c;
  SocialService(this._c);

  Future<List<Map<String,dynamic>>> getFeed({int limit=30}) async {
    final r=await _c.from("posts").select("*").order("created_at",ascending:false).limit(limit);
    return (r as List).cast<Map<String,dynamic>>();
  }
  Future<void> createPost({required String content,String? images,int? topicId}) async {
    await _c.from("posts").insert({'user_id':_c.auth.currentUser!.id,'content':content,'images':images,'topic_id':topicId});
  }
  Future<void> toggleLike(String postId) async {
    await _c.rpc("toggle_like",params:{'p_post_id':postId,'p_user_id':_c.auth.currentUser!.id});
  }
}
