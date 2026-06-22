import "package:supabase_flutter/supabase_flutter.dart";

class FoodService {
  final SupabaseClient _c; FoodService(this._c);
  Future<List<Map<String,dynamic>>> getRestaurants({int limit=30}) async => (_c.from("restaurants").select("*").order("rating",ascending:false).limit(limit) as Future<List>).then((r)=>r.cast<Map<String,dynamic>>());
  Future<List<Map<String,dynamic>>> getMenu(String restaurantId) async => (_c.from("menu_items").select("*").eq("restaurant_id",restaurantId) as Future<List>).then((r)=>r.cast<Map<String,dynamic>>());
  Future<void> placeOrder({required String restaurantId,required List<Map<String,dynamic>> items,required double total,String? address}) async {
    await _c.from("orders").insert({'user_id':_c.auth.currentUser!.id,'restaurant_id':restaurantId,'items':items,'total':total,'address':address,'status':'pending'});
  }
  Future<List<Map<String,dynamic>>> getOrders() async => (_c.from("orders").select("*").eq("user_id",_c.auth.currentUser!.id).order("created_at",ascending:false) as Future<List>).then((r)=>r.cast<Map<String,dynamic>>());
}