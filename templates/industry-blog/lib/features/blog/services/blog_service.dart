import "package:supabase_flutter/supabase_flutter.dart";

class BlogService {
  final SupabaseClient _c; BlogService(this._c);
  Future<List<Map<String,dynamic>>> getArticles({String? category,int limit=30}) async {
    var q=_c.from("articles").select("*").order("created_at",ascending:false).limit(limit);
    if(category!=null) q=q.eq("category_id",category);
    return ((await q) as List).cast<Map<String,dynamic>>();
  }
  Future<void> toggleBookmark(String articleId) async {
    final exists=await _c.from("bookmarks").select("id").eq("user_id",_c.auth.currentUser!.id).eq("article_id",articleId).maybeSingle();
    if(exists!=null) { await _c.from("bookmarks").delete().eq("id",(exists as Map)['id']); }
    else { await _c.from("bookmarks").insert({'user_id':_c.auth.currentUser!.id,'article_id':articleId}); }
  }
  Future<List<Map<String,dynamic>>> getCategories() async => ((await _c.from("categories").select("*").order("name")) as List).cast<Map<String,dynamic>>();
}