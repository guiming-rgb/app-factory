import "package:supabase_flutter/supabase_flutter.dart";

class PhotoService {
  final SupabaseClient _c; PhotoService(this._c);
  Future<List<Map<String,dynamic>>> getPhotos({int limit=30}) async => ((await _c.from("photos").select("*").order("created_at",ascending:false).limit(limit)) as List).cast<Map<String,dynamic>>();
  Future<String> uploadPhoto({required String title,required String imagePath}) async {
    final fileName=''photos/''+DateTime.now().millisecondsSinceEpoch.toString()+'.jpg';
    await _c.storage.from("photos").upload(fileName,await _c.httpClient.get(Uri.parse(imagePath)).then((r)=>r.data));
    final imageUrl=_c.storage.from("photos").getPublicUrl(fileName);
    final r=await _c.from("photos").insert({'user_id':_c.auth.currentUser!.id,'title':title,'image_url':imageUrl}).select("id").single();
    return (r as Map)['id'] as String;
  }
}