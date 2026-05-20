/// Supabase 与运行配置（--dart-define 注入，Generator 可覆写）。
class Env {
  static const supabaseUrl = String.fromEnvironment(
    "SUPABASE_URL",
    defaultValue: "",
  );

  static const supabaseAnonKey = String.fromEnvironment(
    "SUPABASE_ANON_KEY",
    defaultValue: "",
  );

  static bool get hasSupabase =>
      supabaseUrl.isNotEmpty && supabaseAnonKey.isNotEmpty;
}
