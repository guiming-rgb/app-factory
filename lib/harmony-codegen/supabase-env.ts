/** 鸿蒙 codegen 时从工厂环境注入 Supabase（与 NEXT_PUBLIC_* 对齐） */
export function resolveHarmonySupabaseForCodegen(): {
  url: string;
  anonKey: string;
} {
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "",
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? ""
  };
}

export function escapeHarmonyStringLiteral(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}
