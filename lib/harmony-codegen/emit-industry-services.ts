import type { IndustryCategory } from "@/lib/flutter-codegen/emit-industry";

/** 与微信 services/industry.js 完全对齐的 19 命名 service 导出 */
const INDUSTRY_CONFIG: Record<string, { table: string; label: string }> = {
  finance: { table: "transactions", label: "记账" },
  crm: { table: "contacts", label: "CRM" },
  fitness: { table: "workouts", label: "健身" },
  ecommerce: { table: "products", label: "电商" },
  education: { table: "courses", label: "教育" },
  social: { table: "posts", label: "社交" },
  food: { table: "restaurants", label: "外卖" },
  hotel: { table: "hotels", label: "酒店" },
  recruitment: { table: "jobs", label: "招聘" },
  property: { table: "repairs", label: "物业" },
  video: { table: "videos", label: "影音" },
  weather: { table: "cities", label: "天气" },
  sports: { table: "matches", label: "体育" },
  photo: { table: "photos", label: "照片" },
  dating: { table: "user_profiles", label: "交友" },
  medical: { table: "doctors", label: "医疗" },
  blog: { table: "articles", label: "博客" },
  game: { table: "game_scores", label: "游戏" },
  payment: { table: "orders", label: "支付" },
};

/**
 * 生成 IndustryServices.ets — 包含 19 个命名 service 对象
 * 每个 service 有: list(), get(id), create(data), update(id,data), remove(id)
 */
export function emitHarmonyIndustryServicesEts(_industry: IndustryCategory): string {
  // 生成 19 个 service 导出
  const serviceBlocks = Object.entries(INDUSTRY_CONFIG).map(([name, cfg]) => {
    return `// ${cfg.label} (${name}) — ${cfg.table}
export const ${name}Service = {
  list: (params?: string): Promise<Array<Record<string, Object>> | null> =>
    restFetch("${cfg.table}?order=created_at.desc&limit=50" + (params ? "&" + params : "")),
  get: (id: string): Promise<Record<string, Object> | null> =>
    restFetch("${cfg.table}?id=eq." + id + "&limit=1").then((r: object | Array<object> | null) => ((r as Array<Record<string, Object>>)?.[0] ?? null) as Record<string, Object> | null),
  create: (data: Record<string, Object>): Promise<Record<string, Object> | null> =>
    restFetch("${cfg.table}", { method: "POST", extraData: data }),
  update: (id: string, data: Record<string, Object>): Promise<Record<string, Object> | null> =>
    restFetch("${cfg.table}?id=eq." + id, { method: "PATCH", extraData: data }),
  remove: (id: string): Promise<object | null> =>
    restFetch("${cfg.table}?id=eq." + id, { method: "DELETE" }),
};
`;
  }).join("\n");

  return `/**
 * App 生产工厂 — 鸿蒙 IndustryServices（三栈 Parity 对齐微信 exports）
 * 19 行业 Supabase REST 封装
 */
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../utils/SupabaseConfig';

interface RequestInitExtended extends RequestInit {
  extraData?: Record<string, Object>;
}

async function restFetch(path: string, options?: RequestInitExtended): Promise<Array<Record<string, Object>> | null> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;
  const url = SUPABASE_URL.replace(/\\/$/, '') + '/rest/v1/' + path;
  try {
    const resp = await fetch(url, {
      method: options?.method ?? 'GET',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
        ...(options?.headers ?? {}),
      },
      body: options?.extraData ? JSON.stringify(options.extraData) : undefined,
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    return data as Array<Record<string, Object>>;
  } catch (_e) { return null; }
}

${serviceBlocks}

// 当前检测到的行业
export const DETECTED_INDUSTRY: string = '${_industry}';
`;
}
