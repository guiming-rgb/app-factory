import "package:supabase_flutter/supabase_flutter.dart";

/// 电商服务 — 对标淘宝/拼多多商品浏览 + 购物车 + 订单
class EcommerceService {
  final SupabaseClient _client;
  EcommerceService(this._client);

  // ─── 商品浏览 ──────────────────────────────

  Future<List<Map<String, dynamic>>> getProducts({String? category, String? search, int limit = 50}) async {
    var query = _client.from("products").select("*").order("sales", ascending: false).limit(limit);
    if (search != null && search.isNotEmpty) query = query.ilike("name", "%$search%");
    final rows = await query;
    return (rows as List<dynamic>).cast<Map<String, dynamic>>();
  }

  Future<Map<String, dynamic>?> getProduct(String id) async {
    final rows = await _client.from("products").select("*").eq("id", id).single();
    return rows as Map<String, dynamic>?;
  }

  // ─── 购物车 ────────────────────────────────

  Future<List<Map<String, dynamic>>> getCart() async {
    final rows = await _client.from("cart_items").select("*, products(*)").eq("user_id", _client.auth.currentUser!.id);
    return (rows as List<dynamic>).cast<Map<String, dynamic>>();
  }

  Future<void> addToCart(String productId, {int qty = 1}) async {
    final existing = await _client.from("cart_items").select("id,qty").eq("user_id", _client.auth.currentUser!.id).eq("product_id", productId).maybeSingle();
    if (existing != null) {
      await _client.from("cart_items").update({'qty': (existing as Map)['qty'] as int + qty}).eq("id", (existing as Map)['id']);
    } else {
      await _client.from("cart_items").insert({'user_id': _client.auth.currentUser!.id, 'product_id': productId, 'qty': qty});
    }
  }

  Future<void> removeFromCart(String itemId) async => _client.from("cart_items").delete().eq("id", itemId);
  Future<int> getCartCount() async {
    final r = await _client.from("cart_items").select("qty").eq("user_id", _client.auth.currentUser!.id);
    return (r as List).fold<int>(0, (s, item) => s + ((item as Map)['qty'] as int? ?? 0));
  }

  // ─── 订单 ──────────────────────────────────

  Future<List<Map<String, dynamic>>> getOrders() async {
    final rows = await _client.from("orders").select("*").eq("user_id", _client.auth.currentUser!.id).order("created_at", ascending: false);
    return (rows as List<dynamic>).cast<Map<String, dynamic>>();
  }

  Future<String> createOrder(String address) async {
    final cart = await getCart();
    if (cart.isEmpty) throw Exception("购物车为空");
    final items = cart.map((c) => {'product_id': c['product_id'], 'name': (c['products'] as Map?)?['name'] ?? '', 'price': (c['products'] as Map?)?['price'] ?? 0, 'qty': c['qty']}).toList();
    final total = items.fold<double>(0, (s, i) => s + ((i['price'] as num).toDouble() * (i['qty'] as int)));
    final resp = await _client.from("orders").insert({'user_id': _client.auth.currentUser!.id, 'total': total, 'address': address, 'items': items}).select("id").single();
    await _client.from("cart_items").delete().eq("user_id", _client.auth.currentUser!.id);
    return (resp as Map)['id'] as String;
  }
}
