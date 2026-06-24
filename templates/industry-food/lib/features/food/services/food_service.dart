import "package:supabase_flutter/supabase_flutter.dart";

/// 餐饮服务 — 餐馆/菜单/购物车/订单/优惠券
class FoodService {
  final SupabaseClient _client;
  FoodService(this._client);

  // ─── 餐馆 ────────────────────────────────────

  /// 获取餐馆列表（支持搜索、菜系筛选、分页）
  Future<List<Map<String, dynamic>>> getRestaurants({
    String? search,
    String? cuisine,
    int page = 1,
    int limit = 30,
  }) async {
    try {
      final from = (page - 1) * limit;
      var query = _client.from("restaurants").select("*")
          .order("rating", ascending: false)
          .range(from, from + limit - 1);
      if (search != null && search.isNotEmpty) {
        query = query.or("name.ilike.%$search%,description.ilike.%$search%");
      }
      if (cuisine != null) {
        query = query.eq("cuisine", cuisine);
      }
      final rows = await query;
      return (rows as List<dynamic>).cast<Map<String, dynamic>>();
    } catch (_) {
      return [];
    }
  }

  /// 获取餐馆详情
  Future<Map<String, dynamic>?> getRestaurant(String id) async {
    try {
      final rows = await _client.from("restaurants").select("*").eq("id", id).maybeSingle();
      return rows as Map<String, dynamic>?;
    } catch (_) {
      return null;
    }
  }

  // ─── 菜单 ────────────────────────────────────

  /// 获取某餐馆的菜单项（支持分类筛选和分页）
  Future<List<Map<String, dynamic>>> getMenuItems(
    String restaurantId, {
    String? category,
    int page = 1,
    int limit = 50,
  }) async {
    try {
      final from = (page - 1) * limit;
      var query = _client.from("menu_items").select("*")
          .eq("restaurant_id", restaurantId)
          .order("price", ascending: true)
          .range(from, from + limit - 1);
      if (category != null) query = query.eq("category", category);
      final rows = await query;
      return (rows as List<dynamic>).cast<Map<String, dynamic>>();
    } catch (_) {
      return [];
    }
  }

  // ─── 购物车 ──────────────────────────────────

  /// 获取当前用户的购物车（含菜品详情）
  Future<List<Map<String, dynamic>>> getCart() async {
    try {
      final rows = await _client.from("cart_items")
          .select("*, menu_items(*), restaurants!inner(name)")
          .eq("user_id", _client.auth.currentUser!.id);
      return (rows as List<dynamic>).cast<Map<String, dynamic>>();
    } catch (_) {
      return [];
    }
  }

  /// 添加菜品到购物车
  Future<bool> addToCart({
    required String restaurantId,
    required String menuItemId,
    int qty = 1,
  }) async {
    try {
      final existing = await _client.from("cart_items").select("id,qty")
          .eq("user_id", _client.auth.currentUser!.id)
          .eq("menu_item_id", menuItemId)
          .maybeSingle();
      if (existing != null) {
        await _client.from("cart_items").update({
          'qty': (existing as Map)['qty'] as int + qty,
        }).eq("id", (existing as Map)['id']);
      } else {
        await _client.from("cart_items").insert({
          'user_id': _client.auth.currentUser!.id,
          'restaurant_id': restaurantId,
          'menu_item_id': menuItemId,
          'qty': qty,
        });
      }
      return true;
    } catch (_) {
      return false;
    }
  }

  /// 从购物车移除菜品
  Future<bool> removeFromCart(String itemId) async {
    try {
      await _client.from("cart_items").delete()
          .eq("id", itemId).eq("user_id", _client.auth.currentUser!.id);
      return true;
    } catch (_) {
      return false;
    }
  }

  /// 更新购物车菜品数量
  Future<bool> updateCartItemQty(String itemId, int qty) async {
    try {
      await _client.from("cart_items").update({'qty': qty})
          .eq("id", itemId).eq("user_id", _client.auth.currentUser!.id);
      return true;
    } catch (_) {
      return false;
    }
  }

  /// 清空购物车
  Future<bool> clearCart() async {
    try {
      await _client.from("cart_items").delete()
          .eq("user_id", _client.auth.currentUser!.id);
      return true;
    } catch (_) {
      return false;
    }
  }

  // ─── 订单 ────────────────────────────────────

  /// 创建订单（从购物车生成）
  Future<Map<String, dynamic>?> placeOrder({
    required String restaurantId,
    required List<Map<String, dynamic>> items,
    required double total,
    String? address,
    String? note,
  }) async {
    try {
      final resp = await _client.from("orders").insert({
        'user_id': _client.auth.currentUser!.id,
        'restaurant_id': restaurantId,
        'items': items,
        'total': total,
        'address': address,
        'note': note,
        'status': 'pending',
      }).select("id").single();
      return resp as Map<String, dynamic>?;
    } catch (_) {
      return null;
    }
  }

  /// 获取当前用户的订单列表（支持分页和状态筛选）
  Future<List<Map<String, dynamic>>> getOrders({
    String? status,
    int page = 1,
    int limit = 20,
  }) async {
    try {
      final from = (page - 1) * limit;
      var query = _client.from("orders").select("*, restaurants(name,image)")
          .eq("user_id", _client.auth.currentUser!.id)
          .order("created_at", ascending: false)
          .range(from, from + limit - 1);
      if (status != null) query = query.eq("status", status);
      final rows = await query;
      return (rows as List<dynamic>).cast<Map<String, dynamic>>();
    } catch (_) {
      return [];
    }
  }

  /// 获取订单详情
  Future<Map<String, dynamic>?> getOrder(String id) async {
    try {
      final rows = await _client.from("orders").select("*, restaurants(name,image)")
          .eq("id", id).maybeSingle();
      return rows as Map<String, dynamic>?;
    } catch (_) {
      return null;
    }
  }

  /// 取消订单
  Future<bool> cancelOrder(String id) async {
    try {
      await _client.from("orders").update({'status': 'cancelled'})
          .eq("id", id).eq("user_id", _client.auth.currentUser!.id);
      return true;
    } catch (_) {
      return false;
    }
  }

  // ─── 优惠券 ──────────────────────────────────

  /// 获取可领取的优惠券列表
  Future<List<Map<String, dynamic>>> getCoupons({int page = 1, int limit = 20}) async {
    try {
      final from = (page - 1) * limit;
      final rows = await _client.from("coupons").select("*")
          .eq("active", true)
          .order("created_at", ascending: false)
          .range(from, from + limit - 1);
      return (rows as List<dynamic>).cast<Map<String, dynamic>>();
    } catch (_) {
      return [];
    }
  }

  /// 领取优惠券
  Future<Map<String, dynamic>?> claimCoupon(String couponId) async {
    try {
      // 检查是否已领取
      final existing = await _client.from("user_coupons").select("id")
          .eq("user_id", _client.auth.currentUser!.id)
          .eq("coupon_id", couponId)
          .maybeSingle();
      if (existing != null) return null;

      final resp = await _client.from("user_coupons").insert({
        'user_id': _client.auth.currentUser!.id,
        'coupon_id': couponId,
        'claimed_at': DateTime.now().toIso8601String(),
        'used': false,
      }).select("id").single();
      return resp as Map<String, dynamic>?;
    } catch (_) {
      return null;
    }
  }

  /// 获取用户已领取的优惠券
  Future<List<Map<String, dynamic>>> getMyCoupons({bool? used, int page = 1, int limit = 20}) async {
    try {
      final from = (page - 1) * limit;
      var query = _client.from("user_coupons").select("*, coupons(*)")
          .eq("user_id", _client.auth.currentUser!.id)
          .order("claimed_at", ascending: false)
          .range(from, from + limit - 1);
      if (used != null) query = query.eq("used", used);
      final rows = await query;
      return (rows as List<dynamic>).cast<Map<String, dynamic>>();
    } catch (_) {
      return [];
    }
  }
}
