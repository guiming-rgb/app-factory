import "package:supabase_flutter/supabase_flutter.dart";
import "../models/contact.dart";

/// CRM 服务 — 对标 Salesforce Essentials / HubSpot
class CrmService {
  final SupabaseClient _client;
  CrmService(this._client);

  // ─── 客户 CRUD + 管道视图 ──────────────────

  Future<List<Contact>> getContacts({String? stage, String? search, int limit = 100}) async {
    var query = _client.from("contacts").select("*").order("updated_at", ascending: false).limit(limit);
    if (stage != null) query = query.eq("stage", stage);
    if (search != null && search.isNotEmpty) query = query.or("name.ilike.%$search%,company.ilike.%$search%");
    final rows = await query;
    return (rows as List<dynamic>).map((r) => Contact.fromJson(r as Map<String, dynamic>)).toList();
  }

  Future<Map<String, List<Contact>>> getPipeline() async {
    final all = await getContacts(limit: 200);
    final map = <String, List<Contact>>{};
    for (final s in Contact.stages) { map[s] = []; }
    for (final c in all) { map[c.stage]?.add(c); }
    return map;
  }

  Future<void> addContact(Contact c) async => _client.from("contacts").insert(c.toJson());
  Future<void> updateStage(String id, String stage) async => _client.from("contacts").update({'stage': stage, 'updated_at': DateTime.now().toIso8601String()}).eq("id", id);
  Future<void> deleteContact(String id) async => _client.from("contacts").delete().eq("id", id);

  // ─── 活动时间线 ─────────────────────────────

  Future<List<Activity>> getActivities(String contactId) async {
    final rows = await _client.from("activities").select("*").eq("contact_id", contactId).order("created_at", ascending: false).limit(50);
    return (rows as List<dynamic>).map((r) => Activity.fromJson(r as Map<String, dynamic>)).toList();
  }

  Future<void> addActivity(Activity a) async => _client.from("activities").insert({
    'contact_id': a.contactId, 'user_id': _client.auth.currentUser!.id,
    'type': a.type, 'title': a.title, 'description': a.description,
  });

  // ─── 销售漏斗统计 ───────────────────────────

  Future<({int total, double pipelineValue, int won})> getFunnelMetrics() async {
    final all = await getContacts(limit: 500);
    final won = all.where((c) => c.stage == '成交').length;
    final value = all.where((c) => c.stage != '丢失').fold<double>(0, (s, c) => s + (c.dealValue ?? 0));
    return (total: all.length, pipelineValue: value, won: won);
  }
}
