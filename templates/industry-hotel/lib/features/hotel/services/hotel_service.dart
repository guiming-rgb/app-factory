import "package:supabase_flutter/supabase_flutter.dart";

class HotelService {
  final SupabaseClient _c; HotelService(this._c);
  Future<List<Map<String,dynamic>>> searchHotels({String? city,int limit=30}) async {
    var q=_c.from("hotels").select("*").order("rating",ascending:false).limit(limit);
    if(city!=null) q=q.ilike("city","%$city%");
    return ((await q) as List).cast<Map<String,dynamic>>();
  }
  Future<Map<String,dynamic>?> getHotel(String id) async => (await _c.from("hotels").select("*").eq("id",id).maybeSingle()) as Map<String,dynamic>?;
  Future<String> bookRoom({required String hotelId,required DateTime checkIn,required DateTime checkOut,int guests=1}) async {
    final r=await _c.from("bookings").insert({'user_id':_c.auth.currentUser!.id,'hotel_id':hotelId,'check_in':checkIn.toIso8601String(),'check_out':checkOut.toIso8601String(),'guests':guests}).select("id").single();
    return (r as Map)['id'] as String;
  }
}