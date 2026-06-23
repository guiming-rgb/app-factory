import type { IndustryCategory } from "@/lib/flutter-codegen/emit-industry";

/**
 * 鸿蒙 IndustryServices.ets — 与微信 services/industry.js 对齐的 REST 封装
 */
export function emitHarmonyIndustryServicesEts(
  industry: IndustryCategory
): string {
  const industryComment =
    industry === "generic"
      ? "通用 CRUD"
      : `行业: ${industry}`;

  return `/**
 * Supabase REST 服务层 — ${industryComment}
 * 生成于 App 生产工厂 codegen
 */
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../utils/SupabaseConfig';

async function restFetch(path: string, options?: RequestInit): Promise<object | Array<object> | null> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return null;
  }
  const url = SUPABASE_URL.replace(/\\/$/, '') + '/rest/v1/' + path;
  const res = await fetch(url, {
    ...options,
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
      ...(options?.headers as Record<string, string> ?? {}),
    },
  });
  if (!res.ok) {
    throw new Error('HTTP ' + res.status);
  }
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as object | Array<object>;
  } catch {
    return null;
  }
}

export class IndustryCrud {
  static list(table: string, limit: number = 50): Promise<Array<object>> {
    return restFetch(table + '?order=created_at.desc&limit=' + limit, { method: 'GET' })
      .then(r => Array.isArray(r) ? r as Array<object> : []);
  }

  static get(table: string, id: string): Promise<object | null> {
    return restFetch(table + '?id=eq.' + encodeURIComponent(id) + '&limit=1', { method: 'GET' })
      .then(r => {
        const rows = Array.isArray(r) ? r : [];
        return rows.length > 0 ? rows[0] as object : null;
      });
  }

  static create(table: string, data: object): Promise<object | null> {
    return restFetch(table, { method: 'POST', body: JSON.stringify(data) })
      .then(r => {
        const rows = Array.isArray(r) ? r : (r ? [r] : []);
        return rows.length > 0 ? rows[0] as object : null;
      });
  }
}

/** 当前 Spec 检测到的行业（generic 时仅用 IndustryCrud） */
export const DETECTED_INDUSTRY: string = '${industry}';
`;
}
