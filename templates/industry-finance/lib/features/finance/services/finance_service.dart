import "package:supabase_flutter/supabase_flutter.dart";

import "../models/transaction.dart";

/// 记账服务 — Supabase REST + 第三方汇率 API
class FinanceService {
  final SupabaseClient _client;

  FinanceService(this._client);

  // ─── 交易 CRUD ──────────────────────────────

  Future<List<Transaction>> getTransactions({
    int limit = 50,
    String? category,
    String? type,
    DateTime? from,
    DateTime? to,
  }) async {
    var query = _client.from("transactions").select("*").order("created_at", ascending: false).limit(limit);

    if (category != null) query = query.eq("category", category);
    if (type != null) query = query.eq("type", type);
    if (from != null) query = query.gte("created_at", from.toIso8601String());
    if (to != null) query = query.lte("created_at", to.toIso8601String());

    final rows = await query;
    return (rows as List<dynamic>).map((r) => Transaction.fromJson(r as Map<String, dynamic>)).toList();
  }

  Future<void> addTransaction(Transaction t) async {
    await _client.from("transactions").insert(t.toJson());
  }

  Future<void> deleteTransaction(String id) async {
    await _client.from("transactions").delete().eq("id", id);
  }

  // ─── 月度统计 ──────────────────────────────

  Future<({double income, double expense, Map<String, double> byCategory})> getMonthlySummary({DateTime? month}) async {
    final m = month ?? DateTime.now();
    final start = DateTime(m.year, m.month, 1).toIso8601String();
    final end = DateTime(m.year, m.month + 1, 0, 23, 59, 59).toIso8601String();

    final rows = await _client.from("transactions").select("amount,type,category")
        .gte("created_at", start).lte("created_at", end);

    double income = 0, expense = 0;
    final byCategory = <String, double>{};

    for (final r in rows as List<dynamic>) {
      final map = r as Map<String, dynamic>;
      final amt = (map['amount'] as num).toDouble();
      final cat = map['category'] as String? ?? '其他';

      if (map['type'] == 'income') {
        income += amt;
      } else {
        expense += amt;
        byCategory[cat] = (byCategory[cat] ?? 0) + amt;
      }
    }

    return (income: income, expense: expense, byCategory: byCategory);
  }

  // ─── 预算 CRUD ──────────────────────────────

  Future<List<Budget>> getBudgets() async {
    final rows = await _client.from("budgets").select("*");
    return (rows as List<dynamic>).map((r) => Budget.fromJson(r as Map<String, dynamic>)).toList();
  }

  Future<Map<String, double>> getBudgetProgress(String period) async {
    final budgets = await getBudgets();
    final summary = await getMonthlySummary();
    final result = <String, double>{};
    for (final b in budgets) {
      result[b.category] = summary.byCategory[b.category] ?? 0;
    }
    return result;
  }

  // ─── 账户 ───────────────────────────────────

  Future<List<Account>> getAccounts() async {
    final rows = await _client.from("accounts").select("*");
    return (rows as List<dynamic>).map((r) => Account.fromJson(r as Map<String, dynamic>)).toList();
  }

  // ─── 第三方 API: 汇率（exchangerate-api.com 免费层） ───

  static Future<double?> getExchangeRate(String from, String to) async {
    try {
      final uri = Uri.parse("https://open.er-api.com/v6/latest/$from");
      final resp = await Supabase.instance.client.httpClient.get(uri);
      if (resp.statusCode == 200) {
        // ignore: avoid_dynamic_calls
        return resp.data['rates']?[to]?.toDouble();
      }
    } catch (_) {}
    return null;
  }
}
