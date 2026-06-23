/**
 * App 生产工厂 — 鸿蒙 IndustryServices（三栈 Parity 对齐微信 exports）
 * 19 行业 Supabase REST 封装
 */
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../utils/SupabaseConfig';

interface RequestInitExtended extends RequestInit {
  extraData?: Record<string, Object>;
}

async function restFetch(path: string, options?: RequestInitExtended): Promise<Array<Record<string, Object>> | null> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;
  const url = SUPABASE_URL.replace(/\/$/, '') + '/rest/v1/' + path;
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

// 记账 (finance) — transactions
export const financeService = {
  list: (params?: string): Promise<Array<Record<string, Object>> | null> =>
    restFetch("transactions?order=created_at.desc&limit=50" + (params ? "&" + params : "")),
  get: (id: string): Promise<Record<string, Object> | null> =>
    restFetch("transactions?id=eq." + id + "&limit=1").then((r: object | Array<object> | null) => ((r as Array<Record<string, Object>>)?.[0] ?? null) as Record<string, Object> | null),
  create: (data: Record<string, Object>): Promise<Record<string, Object> | null> =>
    restFetch("transactions", { method: "POST", extraData: data }),
  update: (id: string, data: Record<string, Object>): Promise<Record<string, Object> | null> =>
    restFetch("transactions?id=eq." + id, { method: "PATCH", extraData: data }),
  remove: (id: string): Promise<object | null> =>
    restFetch("transactions?id=eq." + id, { method: "DELETE" }),
};

// CRM (crm) — contacts
export const crmService = {
  list: (params?: string): Promise<Array<Record<string, Object>> | null> =>
    restFetch("contacts?order=created_at.desc&limit=50" + (params ? "&" + params : "")),
  get: (id: string): Promise<Record<string, Object> | null> =>
    restFetch("contacts?id=eq." + id + "&limit=1").then((r: object | Array<object> | null) => ((r as Array<Record<string, Object>>)?.[0] ?? null) as Record<string, Object> | null),
  create: (data: Record<string, Object>): Promise<Record<string, Object> | null> =>
    restFetch("contacts", { method: "POST", extraData: data }),
  update: (id: string, data: Record<string, Object>): Promise<Record<string, Object> | null> =>
    restFetch("contacts?id=eq." + id, { method: "PATCH", extraData: data }),
  remove: (id: string): Promise<object | null> =>
    restFetch("contacts?id=eq." + id, { method: "DELETE" }),
};

// 健身 (fitness) — workouts
export const fitnessService = {
  list: (params?: string): Promise<Array<Record<string, Object>> | null> =>
    restFetch("workouts?order=created_at.desc&limit=50" + (params ? "&" + params : "")),
  get: (id: string): Promise<Record<string, Object> | null> =>
    restFetch("workouts?id=eq." + id + "&limit=1").then((r: object | Array<object> | null) => ((r as Array<Record<string, Object>>)?.[0] ?? null) as Record<string, Object> | null),
  create: (data: Record<string, Object>): Promise<Record<string, Object> | null> =>
    restFetch("workouts", { method: "POST", extraData: data }),
  update: (id: string, data: Record<string, Object>): Promise<Record<string, Object> | null> =>
    restFetch("workouts?id=eq." + id, { method: "PATCH", extraData: data }),
  remove: (id: string): Promise<object | null> =>
    restFetch("workouts?id=eq." + id, { method: "DELETE" }),
};

// 电商 (ecommerce) — products
export const ecommerceService = {
  list: (params?: string): Promise<Array<Record<string, Object>> | null> =>
    restFetch("products?order=created_at.desc&limit=50" + (params ? "&" + params : "")),
  get: (id: string): Promise<Record<string, Object> | null> =>
    restFetch("products?id=eq." + id + "&limit=1").then((r: object | Array<object> | null) => ((r as Array<Record<string, Object>>)?.[0] ?? null) as Record<string, Object> | null),
  create: (data: Record<string, Object>): Promise<Record<string, Object> | null> =>
    restFetch("products", { method: "POST", extraData: data }),
  update: (id: string, data: Record<string, Object>): Promise<Record<string, Object> | null> =>
    restFetch("products?id=eq." + id, { method: "PATCH", extraData: data }),
  remove: (id: string): Promise<object | null> =>
    restFetch("products?id=eq." + id, { method: "DELETE" }),
};

// 教育 (education) — courses
export const educationService = {
  list: (params?: string): Promise<Array<Record<string, Object>> | null> =>
    restFetch("courses?order=created_at.desc&limit=50" + (params ? "&" + params : "")),
  get: (id: string): Promise<Record<string, Object> | null> =>
    restFetch("courses?id=eq." + id + "&limit=1").then((r: object | Array<object> | null) => ((r as Array<Record<string, Object>>)?.[0] ?? null) as Record<string, Object> | null),
  create: (data: Record<string, Object>): Promise<Record<string, Object> | null> =>
    restFetch("courses", { method: "POST", extraData: data }),
  update: (id: string, data: Record<string, Object>): Promise<Record<string, Object> | null> =>
    restFetch("courses?id=eq." + id, { method: "PATCH", extraData: data }),
  remove: (id: string): Promise<object | null> =>
    restFetch("courses?id=eq." + id, { method: "DELETE" }),
};

// 社交 (social) — posts
export const socialService = {
  list: (params?: string): Promise<Array<Record<string, Object>> | null> =>
    restFetch("posts?order=created_at.desc&limit=50" + (params ? "&" + params : "")),
  get: (id: string): Promise<Record<string, Object> | null> =>
    restFetch("posts?id=eq." + id + "&limit=1").then((r: object | Array<object> | null) => ((r as Array<Record<string, Object>>)?.[0] ?? null) as Record<string, Object> | null),
  create: (data: Record<string, Object>): Promise<Record<string, Object> | null> =>
    restFetch("posts", { method: "POST", extraData: data }),
  update: (id: string, data: Record<string, Object>): Promise<Record<string, Object> | null> =>
    restFetch("posts?id=eq." + id, { method: "PATCH", extraData: data }),
  remove: (id: string): Promise<object | null> =>
    restFetch("posts?id=eq." + id, { method: "DELETE" }),
};

// 外卖 (food) — restaurants
export const foodService = {
  list: (params?: string): Promise<Array<Record<string, Object>> | null> =>
    restFetch("restaurants?order=created_at.desc&limit=50" + (params ? "&" + params : "")),
  get: (id: string): Promise<Record<string, Object> | null> =>
    restFetch("restaurants?id=eq." + id + "&limit=1").then((r: object | Array<object> | null) => ((r as Array<Record<string, Object>>)?.[0] ?? null) as Record<string, Object> | null),
  create: (data: Record<string, Object>): Promise<Record<string, Object> | null> =>
    restFetch("restaurants", { method: "POST", extraData: data }),
  update: (id: string, data: Record<string, Object>): Promise<Record<string, Object> | null> =>
    restFetch("restaurants?id=eq." + id, { method: "PATCH", extraData: data }),
  remove: (id: string): Promise<object | null> =>
    restFetch("restaurants?id=eq." + id, { method: "DELETE" }),
};

// 酒店 (hotel) — hotels
export const hotelService = {
  list: (params?: string): Promise<Array<Record<string, Object>> | null> =>
    restFetch("hotels?order=created_at.desc&limit=50" + (params ? "&" + params : "")),
  get: (id: string): Promise<Record<string, Object> | null> =>
    restFetch("hotels?id=eq." + id + "&limit=1").then((r: object | Array<object> | null) => ((r as Array<Record<string, Object>>)?.[0] ?? null) as Record<string, Object> | null),
  create: (data: Record<string, Object>): Promise<Record<string, Object> | null> =>
    restFetch("hotels", { method: "POST", extraData: data }),
  update: (id: string, data: Record<string, Object>): Promise<Record<string, Object> | null> =>
    restFetch("hotels?id=eq." + id, { method: "PATCH", extraData: data }),
  remove: (id: string): Promise<object | null> =>
    restFetch("hotels?id=eq." + id, { method: "DELETE" }),
};

// 招聘 (recruitment) — jobs
export const recruitmentService = {
  list: (params?: string): Promise<Array<Record<string, Object>> | null> =>
    restFetch("jobs?order=created_at.desc&limit=50" + (params ? "&" + params : "")),
  get: (id: string): Promise<Record<string, Object> | null> =>
    restFetch("jobs?id=eq." + id + "&limit=1").then((r: object | Array<object> | null) => ((r as Array<Record<string, Object>>)?.[0] ?? null) as Record<string, Object> | null),
  create: (data: Record<string, Object>): Promise<Record<string, Object> | null> =>
    restFetch("jobs", { method: "POST", extraData: data }),
  update: (id: string, data: Record<string, Object>): Promise<Record<string, Object> | null> =>
    restFetch("jobs?id=eq." + id, { method: "PATCH", extraData: data }),
  remove: (id: string): Promise<object | null> =>
    restFetch("jobs?id=eq." + id, { method: "DELETE" }),
};

// 物业 (property) — repairs
export const propertyService = {
  list: (params?: string): Promise<Array<Record<string, Object>> | null> =>
    restFetch("repairs?order=created_at.desc&limit=50" + (params ? "&" + params : "")),
  get: (id: string): Promise<Record<string, Object> | null> =>
    restFetch("repairs?id=eq." + id + "&limit=1").then((r: object | Array<object> | null) => ((r as Array<Record<string, Object>>)?.[0] ?? null) as Record<string, Object> | null),
  create: (data: Record<string, Object>): Promise<Record<string, Object> | null> =>
    restFetch("repairs", { method: "POST", extraData: data }),
  update: (id: string, data: Record<string, Object>): Promise<Record<string, Object> | null> =>
    restFetch("repairs?id=eq." + id, { method: "PATCH", extraData: data }),
  remove: (id: string): Promise<object | null> =>
    restFetch("repairs?id=eq." + id, { method: "DELETE" }),
};

// 影音 (video) — videos
export const videoService = {
  list: (params?: string): Promise<Array<Record<string, Object>> | null> =>
    restFetch("videos?order=created_at.desc&limit=50" + (params ? "&" + params : "")),
  get: (id: string): Promise<Record<string, Object> | null> =>
    restFetch("videos?id=eq." + id + "&limit=1").then((r: object | Array<object> | null) => ((r as Array<Record<string, Object>>)?.[0] ?? null) as Record<string, Object> | null),
  create: (data: Record<string, Object>): Promise<Record<string, Object> | null> =>
    restFetch("videos", { method: "POST", extraData: data }),
  update: (id: string, data: Record<string, Object>): Promise<Record<string, Object> | null> =>
    restFetch("videos?id=eq." + id, { method: "PATCH", extraData: data }),
  remove: (id: string): Promise<object | null> =>
    restFetch("videos?id=eq." + id, { method: "DELETE" }),
};

// 天气 (weather) — cities
export const weatherService = {
  list: (params?: string): Promise<Array<Record<string, Object>> | null> =>
    restFetch("cities?order=created_at.desc&limit=50" + (params ? "&" + params : "")),
  get: (id: string): Promise<Record<string, Object> | null> =>
    restFetch("cities?id=eq." + id + "&limit=1").then((r: object | Array<object> | null) => ((r as Array<Record<string, Object>>)?.[0] ?? null) as Record<string, Object> | null),
  create: (data: Record<string, Object>): Promise<Record<string, Object> | null> =>
    restFetch("cities", { method: "POST", extraData: data }),
  update: (id: string, data: Record<string, Object>): Promise<Record<string, Object> | null> =>
    restFetch("cities?id=eq." + id, { method: "PATCH", extraData: data }),
  remove: (id: string): Promise<object | null> =>
    restFetch("cities?id=eq." + id, { method: "DELETE" }),
};

// 体育 (sports) — matches
export const sportsService = {
  list: (params?: string): Promise<Array<Record<string, Object>> | null> =>
    restFetch("matches?order=created_at.desc&limit=50" + (params ? "&" + params : "")),
  get: (id: string): Promise<Record<string, Object> | null> =>
    restFetch("matches?id=eq." + id + "&limit=1").then((r: object | Array<object> | null) => ((r as Array<Record<string, Object>>)?.[0] ?? null) as Record<string, Object> | null),
  create: (data: Record<string, Object>): Promise<Record<string, Object> | null> =>
    restFetch("matches", { method: "POST", extraData: data }),
  update: (id: string, data: Record<string, Object>): Promise<Record<string, Object> | null> =>
    restFetch("matches?id=eq." + id, { method: "PATCH", extraData: data }),
  remove: (id: string): Promise<object | null> =>
    restFetch("matches?id=eq." + id, { method: "DELETE" }),
};

// 照片 (photo) — photos
export const photoService = {
  list: (params?: string): Promise<Array<Record<string, Object>> | null> =>
    restFetch("photos?order=created_at.desc&limit=50" + (params ? "&" + params : "")),
  get: (id: string): Promise<Record<string, Object> | null> =>
    restFetch("photos?id=eq." + id + "&limit=1").then((r: object | Array<object> | null) => ((r as Array<Record<string, Object>>)?.[0] ?? null) as Record<string, Object> | null),
  create: (data: Record<string, Object>): Promise<Record<string, Object> | null> =>
    restFetch("photos", { method: "POST", extraData: data }),
  update: (id: string, data: Record<string, Object>): Promise<Record<string, Object> | null> =>
    restFetch("photos?id=eq." + id, { method: "PATCH", extraData: data }),
  remove: (id: string): Promise<object | null> =>
    restFetch("photos?id=eq." + id, { method: "DELETE" }),
};

// 交友 (dating) — user_profiles
export const datingService = {
  list: (params?: string): Promise<Array<Record<string, Object>> | null> =>
    restFetch("user_profiles?order=created_at.desc&limit=50" + (params ? "&" + params : "")),
  get: (id: string): Promise<Record<string, Object> | null> =>
    restFetch("user_profiles?id=eq." + id + "&limit=1").then((r: object | Array<object> | null) => ((r as Array<Record<string, Object>>)?.[0] ?? null) as Record<string, Object> | null),
  create: (data: Record<string, Object>): Promise<Record<string, Object> | null> =>
    restFetch("user_profiles", { method: "POST", extraData: data }),
  update: (id: string, data: Record<string, Object>): Promise<Record<string, Object> | null> =>
    restFetch("user_profiles?id=eq." + id, { method: "PATCH", extraData: data }),
  remove: (id: string): Promise<object | null> =>
    restFetch("user_profiles?id=eq." + id, { method: "DELETE" }),
};

// 医疗 (medical) — doctors
export const medicalService = {
  list: (params?: string): Promise<Array<Record<string, Object>> | null> =>
    restFetch("doctors?order=created_at.desc&limit=50" + (params ? "&" + params : "")),
  get: (id: string): Promise<Record<string, Object> | null> =>
    restFetch("doctors?id=eq." + id + "&limit=1").then((r: object | Array<object> | null) => ((r as Array<Record<string, Object>>)?.[0] ?? null) as Record<string, Object> | null),
  create: (data: Record<string, Object>): Promise<Record<string, Object> | null> =>
    restFetch("doctors", { method: "POST", extraData: data }),
  update: (id: string, data: Record<string, Object>): Promise<Record<string, Object> | null> =>
    restFetch("doctors?id=eq." + id, { method: "PATCH", extraData: data }),
  remove: (id: string): Promise<object | null> =>
    restFetch("doctors?id=eq." + id, { method: "DELETE" }),
};

// 博客 (blog) — articles
export const blogService = {
  list: (params?: string): Promise<Array<Record<string, Object>> | null> =>
    restFetch("articles?order=created_at.desc&limit=50" + (params ? "&" + params : "")),
  get: (id: string): Promise<Record<string, Object> | null> =>
    restFetch("articles?id=eq." + id + "&limit=1").then((r: object | Array<object> | null) => ((r as Array<Record<string, Object>>)?.[0] ?? null) as Record<string, Object> | null),
  create: (data: Record<string, Object>): Promise<Record<string, Object> | null> =>
    restFetch("articles", { method: "POST", extraData: data }),
  update: (id: string, data: Record<string, Object>): Promise<Record<string, Object> | null> =>
    restFetch("articles?id=eq." + id, { method: "PATCH", extraData: data }),
  remove: (id: string): Promise<object | null> =>
    restFetch("articles?id=eq." + id, { method: "DELETE" }),
};

// 游戏 (game) — game_scores
export const gameService = {
  list: (params?: string): Promise<Array<Record<string, Object>> | null> =>
    restFetch("game_scores?order=created_at.desc&limit=50" + (params ? "&" + params : "")),
  get: (id: string): Promise<Record<string, Object> | null> =>
    restFetch("game_scores?id=eq." + id + "&limit=1").then((r: object | Array<object> | null) => ((r as Array<Record<string, Object>>)?.[0] ?? null) as Record<string, Object> | null),
  create: (data: Record<string, Object>): Promise<Record<string, Object> | null> =>
    restFetch("game_scores", { method: "POST", extraData: data }),
  update: (id: string, data: Record<string, Object>): Promise<Record<string, Object> | null> =>
    restFetch("game_scores?id=eq." + id, { method: "PATCH", extraData: data }),
  remove: (id: string): Promise<object | null> =>
    restFetch("game_scores?id=eq." + id, { method: "DELETE" }),
};

// 支付 (payment) — orders
export const paymentService = {
  list: (params?: string): Promise<Array<Record<string, Object>> | null> =>
    restFetch("orders?order=created_at.desc&limit=50" + (params ? "&" + params : "")),
  get: (id: string): Promise<Record<string, Object> | null> =>
    restFetch("orders?id=eq." + id + "&limit=1").then((r: object | Array<object> | null) => ((r as Array<Record<string, Object>>)?.[0] ?? null) as Record<string, Object> | null),
  create: (data: Record<string, Object>): Promise<Record<string, Object> | null> =>
    restFetch("orders", { method: "POST", extraData: data }),
  update: (id: string, data: Record<string, Object>): Promise<Record<string, Object> | null> =>
    restFetch("orders?id=eq." + id, { method: "PATCH", extraData: data }),
  remove: (id: string): Promise<object | null> =>
    restFetch("orders?id=eq." + id, { method: "DELETE" }),
};


// 当前检测到的行业
export const DETECTED_INDUSTRY: string = 'finance';
