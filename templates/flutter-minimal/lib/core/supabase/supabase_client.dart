import "package:supabase_flutter/supabase_flutter.dart";

import "../config/env.dart";

/// 惰性初始化 Supabase；无配置时不抛错，便于模板单独 analyze。
Future<void> initSupabaseIfConfigured() async {
  if (!Env.hasSupabase) {
    return;
  }
  await Supabase.initialize(
    url: Env.supabaseUrl,
    anonKey: Env.supabaseAnonKey,
  );
}

SupabaseClient? get supabaseOrNull =>
    Env.hasSupabase ? Supabase.instance.client : null;
