import "package:supabase_flutter/supabase_flutter.dart";

class VideoService {
  final SupabaseClient _c; VideoService(this._c);
  Future<List<Map<String,dynamic>>> getVideos({String? category,int limit=30}) async {
    var q=_c.from("videos").select("*").order("created_at",ascending:false).limit(limit);
    if(category!=null) q=q.eq("category",category);
    return ((await q) as List).cast<Map<String,dynamic>>();
  }
  Future<void> addToFavorites(String videoId) async {
    await _c.from("favorites").insert({'user_id':_c.auth.currentUser!.id,'video_id':videoId});
  }
  Future<void> addToHistory(String videoId) async {
    await _c.from("history").upsert({'user_id':_c.auth.currentUser!.id,'video_id':videoId,'watched_at':DateTime.now().toIso8601String()});
  }
}