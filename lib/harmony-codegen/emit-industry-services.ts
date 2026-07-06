import type { IndustryCategory } from "@/lib/app-spec/industry";
import { listIndustryEmitConfigs } from "@/lib/app-spec/emit-shared";

/** 从 INDUSTRY_METHODS 块提取方法名（供配置 parity 校验） */
export function extractHarmonyMethodNames(block: string): string[] {
  return [...block.matchAll(/\n  (\w+):/g)].map((m) => m[1]);
}

/** P0-B-1: 鸿蒙 19 行业差异化服务方法 — 对齐微信 industry.js 302 行业务逻辑 */
const INDUSTRY_METHODS: Record<string, string> = {
  finance: `
  getMonthlySummary: (month?: string): Promise<Array<Record<string, Object>> | null> => {
    const m = month || new Date().toISOString().substring(0, 7);
    return restFetch("transactions?created_at=gte." + m + "-01&created_at=lte." + m + "-31");
  },
  getBudgets: (): Promise<Array<Record<string, Object>> | null> => restFetch("budgets"),
  getAccounts: (): Promise<Array<Record<string, Object>> | null> => restFetch("accounts"),`,

  crm: `
  getPipeline: (): Promise<Array<Record<string, Object>> | null> => restFetch("contacts?order=stage"),
  getActivities: (contactId: string): Promise<Array<Record<string, Object>> | null> =>
    restFetch("activities?contact_id=eq." + contactId + "&order=created_at.desc"),
  addActivity: (data: Record<string, Object>): Promise<Record<string, Object> | null> =>
    restFetch("activities", { method: "POST", extraData: data }),`,

  fitness: `
  getBodyStats: (): Promise<Array<Record<string, Object>> | null> => restFetch("body_stats?order=recorded_at.desc&limit=30"),
  addBodyStat: (data: Record<string, Object>): Promise<Record<string, Object> | null> =>
    restFetch("body_stats", { method: "POST", extraData: data }),
  getWorkoutLog: (courseId: string): Promise<Array<Record<string, Object>> | null> =>
    restFetch("workout_log?course_id=eq." + courseId + "&order=date.desc"),`,

  ecommerce: `
  getCart: (): Promise<Array<Record<string, Object>> | null> => restFetch("cart_items?select=*,products(*)"),
  addToCart: (productId: string, qty: number = 1): Promise<Record<string, Object> | null> => {
    return restFetch("cart_items?product_id=eq." + productId + "&limit=1").then((items) => {
      if (items && items.length > 0) return restFetch("cart_items?id=eq." + items[0]["id"], { method: "PATCH", extraData: { qty: (Number(items[0]["qty"]) || 0) + qty } });
      return restFetch("cart_items", { method: "POST", extraData: { product_id: productId, qty } });
    });
  },
  getOrders: (): Promise<Array<Record<string, Object>> | null> => restFetch("orders?order=created_at.desc"),
  topSelling: (limit: number = 10): Promise<Array<Record<string, Object>> | null> =>
    restFetch("products?order=sales.desc&limit=" + limit),
  createOrder: (address: string): Promise<Record<string, Object> | null> =>
    restFetch("orders", { method: "POST", extraData: { address, status: "待支付" } }),`,

  education: `
  getAssignments: (courseId: string): Promise<Array<Record<string, Object>> | null> =>
    restFetch("assignments?course_id=eq." + courseId + "&order=deadline"),
  getGrades: (courseId: string): Promise<Array<Record<string, Object>> | null> =>
    restFetch("grades?course_id=eq." + courseId + "&order=created_at.desc"),
  getTodaySchedule: (): Promise<Array<Record<string, Object>> | null> => {
    const today = new Date().getDay();
    return restFetch("courses?day_of_week=eq." + today + "&order=start_time");
  },`,

  social: `
  getTopics: (): Promise<Array<Record<string, Object>> | null> => restFetch("topics?order=post_count.desc"),
  getPostsByTopic: (topicId: string, page: number = 0): Promise<Array<Record<string, Object>> | null> =>
    restFetch("posts?topic_id=eq." + topicId + "&order=created_at.desc&limit=20&offset=" + (page * 20)),
  likePost: (postId: string): Promise<Record<string, Object> | null> =>
    restFetch("rpc/increment_likes", { method: "POST", extraData: { post_id: postId } }),
  getComments: (postId: string): Promise<Array<Record<string, Object>> | null> =>
    restFetch("comments?post_id=eq." + postId + "&order=created_at"),
  getFollowingPosts: (userIds: string): Promise<Array<Record<string, Object>> | null> =>
    restFetch("posts?user_id=in.(" + userIds + ")&order=created_at.desc&limit=30"),
  searchPosts: (q: string, page: number = 0): Promise<Array<Record<string, Object>> | null> =>
    restFetch("posts?or=(content.ilike.%25" + q + "%25,topic_id.ilike.%25" + q + "%25)&order=created_at.desc&limit=20&offset=" + (page * 20)),`,

  food: `
  getMenu: (rId: string): Promise<Array<Record<string, Object>> | null> =>
    restFetch("menu_items?restaurant_id=eq." + rId + "&order=sales.desc"),
  searchRestaurants: (q: string): Promise<Array<Record<string, Object>> | null> =>
    restFetch("restaurants?or=(name.ilike.%25" + q + "%25,cuisine.ilike.%25" + q + "%25)&order=rating.desc&limit=30"),
  filterByCuisine: (cuisine: string): Promise<Array<Record<string, Object>> | null> =>
    restFetch("restaurants?cuisine=eq." + cuisine + "&order=rating.desc&limit=30"),
  getCart: (): Promise<Array<Record<string, Object>> | null> => restFetch("cart_items?select=*,menu_items(*)"),
  getCoupons: (): Promise<Array<Record<string, Object>> | null> => {
    const today = new Date().toISOString().substring(0, 10);
    return restFetch("coupons?expire_at=gte." + today);
  },
  claimCoupon: (couponId: string): Promise<Record<string, Object> | null> =>
    restFetch("coupons", { method: "POST", extraData: { coupon_id: couponId } }),
  getOrders: (): Promise<Array<Record<string, Object>> | null> => restFetch("orders?order=created_at.desc"),
  createOrder: (restaurantId: string, address: string): Promise<Record<string, Object> | null> =>
    restFetch("orders", { method: "POST", extraData: { restaurant_id: restaurantId, address, status: "已下单" } }),`,

  hotel: `
  search: (city: string, guests: number = 1): Promise<Array<Record<string, Object>> | null> => {
    let q = "hotels?city=ilike.%25" + city + "%25";
    if (guests > 0) q += "&capacity=gte." + guests;
    return restFetch(q + "&order=rating.desc&limit=30");
  },
  getRooms: (hotelId: string): Promise<Array<Record<string, Object>> | null> =>
    restFetch("room_types?hotel_id=eq." + hotelId + "&order=price"),
  bookRoom: (data: Record<string, Object>): Promise<Record<string, Object> | null> =>
    restFetch("bookings", { method: "POST", extraData: data }),
  getMyBookings: (): Promise<Array<Record<string, Object>> | null> => restFetch("bookings?order=created_at.desc"),
  cancelBooking: (bookingId: string): Promise<Record<string, Object> | null> =>
    restFetch("bookings?id=eq." + bookingId, { method: "PATCH", extraData: { status: "已取消" } }),
  getReviews: (hotelId: string): Promise<Array<Record<string, Object>> | null> =>
    restFetch("reviews?hotel_id=eq." + hotelId + "&order=created_at.desc&limit=20"),
  addReview: (data: Record<string, Object>): Promise<Record<string, Object> | null> =>
    restFetch("reviews", { method: "POST", extraData: data }),`,

  recruitment: `
  search: (keyword: string, location?: string, salaryMin?: number): Promise<Array<Record<string, Object>> | null> => {
    let q = "jobs?order=created_at.desc&limit=30";
    if (keyword) q += "&or=(title.ilike.%25" + keyword + "%25,skills.ilike.%25" + keyword + "%25)";
    if (location) q += "&location=ilike.%25" + location + "%25";
    if (salaryMin && salaryMin > 0) q += "&salary_min=gte." + salaryMin;
    return restFetch(q);
  },
  getCompanies: (page: number = 0): Promise<Array<Record<string, Object>> | null> =>
    restFetch("companies?order=name&limit=20&offset=" + (page * 20)),
  getCompanyJobs: (companyId: string): Promise<Array<Record<string, Object>> | null> =>
    restFetch("jobs?company_id=eq." + companyId + "&order=created_at.desc"),
  apply: (data: Record<string, Object>): Promise<Record<string, Object> | null> =>
    restFetch("applications", { method: "POST", extraData: data }),
  getMyApplications: (): Promise<Array<Record<string, Object>> | null> =>
    restFetch("applications?order=created_at.desc"),`,

  property: `
  submitRepair: (title: string, description: string, image?: string): Promise<Record<string, Object> | null> =>
    restFetch("repairs", { method: "POST", extraData: { title, description, image, status: "待处理" } }),
  getMyRepairs: (): Promise<Array<Record<string, Object>> | null> => restFetch("repairs?order=created_at.desc"),
  getNotices: (): Promise<Array<Record<string, Object>> | null> => restFetch("notices?order=created_at.desc&limit=20"),
  getImportantNotices: (): Promise<Array<Record<string, Object>> | null> =>
    restFetch("notices?importance=eq.紧急&order=created_at.desc&limit=5"),
  getPayments: (): Promise<Array<Record<string, Object>> | null> => restFetch("payments?order=period.desc"),
  payBill: (paymentId: string): Promise<Record<string, Object> | null> =>
    restFetch("payments?id=eq." + paymentId, { method: "PATCH", extraData: { status: "已缴" } }),
  registerVisitor: (data: Record<string, Object>): Promise<Record<string, Object> | null> =>
    restFetch("visitors", { method: "POST", extraData: { ...data, status: "待审批" } }),
  getVisitors: (): Promise<Array<Record<string, Object>> | null> => restFetch("visitors?order=visit_date.desc"),
  getFacilities: (): Promise<Array<Record<string, Object>> | null> => restFetch("facilities?order=name"),
  bookFacility: (facilityId: string, date: string, timeSlot: string): Promise<Record<string, Object> | null> =>
    restFetch("facility_bookings", { method: "POST", extraData: { facility_id: facilityId, date, time_slot: timeSlot } }),`,

  video: `
  getByCategory: (category: string, page: number = 0): Promise<Array<Record<string, Object>> | null> =>
    restFetch("videos?category=eq." + category + "&order=views.desc&limit=20&offset=" + (page * 20)),
  getTrending: (): Promise<Array<Record<string, Object>> | null> => restFetch("videos?order=views.desc&limit=20"),
  search: (q: string): Promise<Array<Record<string, Object>> | null> =>
    restFetch("videos?or=(title.ilike.%25" + q + "%25,description.ilike.%25" + q + "%25)&order=views.desc&limit=30"),
  getFavorites: (): Promise<Array<Record<string, Object>> | null> =>
    restFetch("favorites?select=*,videos(*)&order=created_at.desc"),
  addFavorite: (vId: string): Promise<Record<string, Object> | null> =>
    restFetch("favorites", { method: "POST", extraData: { video_id: vId } }),
  removeFavorite: (vId: string): Promise<object | null> =>
    restFetch("favorites?video_id=eq." + vId, { method: "DELETE" }),
  getWatchHistory: (): Promise<Array<Record<string, Object>> | null> =>
    restFetch("watch_history?order=watched_at.desc&limit=30"),
  getRecommendations: (): Promise<Array<Record<string, Object>> | null> =>
    restFetch("videos?order=rating.desc&limit=10"),`,

  weather: `
  setCurrentCity: (cityId: string): Promise<Record<string, Object> | null> =>
    restFetch("cities?id=eq." + cityId, { method: "PATCH", extraData: { is_current: true } }),
  getCurrentCity: (): Promise<Record<string, Object> | null> =>
    restFetch("cities?is_current=eq.true&limit=1").then((r) => (r && r[0]) as Record<string, Object> | null),
  getHourly: (cityId: string, date?: string): Promise<Array<Record<string, Object>> | null> => {
    const d = date || new Date().toISOString().substring(0, 10);
    return restFetch("forecasts?city_id=eq." + cityId + "&date=eq." + d + "&order=time&limit=24");
  },
  getDaily: (cityId: string, days: number = 7): Promise<Array<Record<string, Object>> | null> => {
    const today = new Date().toISOString().substring(0, 10);
    const end = new Date(Date.now() + days * 86400000).toISOString().substring(0, 10);
    return restFetch("forecasts?city_id=eq." + cityId + "&date=gte." + today + "&date=lte." + end + "&order=date&limit=" + days);
  },
  getAqi: (cityId: string): Promise<Record<string, Object> | null> =>
    restFetch("aqi_data?city_id=eq." + cityId + "&order=measured_at.desc&limit=1").then((r) => (r && r[0]) as Record<string, Object> | null),
  getLifeIndex: (cityId: string): Promise<Record<string, Object> | null> =>
    restFetch("life_indices?city_id=eq." + cityId + "&order=date.desc&limit=1").then((r) => (r && r[0]) as Record<string, Object> | null),
  removeCity: (cityId: string): Promise<object | null> => restFetch("cities?id=eq." + cityId, { method: "DELETE" }),`,

  sports: `
  getLiveMatches: (): Promise<Array<Record<string, Object>> | null> => restFetch("matches?status=eq.进行中&order=date"),
  getUpcoming: (page: number = 0): Promise<Array<Record<string, Object>> | null> => {
    const today = new Date().toISOString().substring(0, 10);
    return restFetch("matches?date=gte." + today + "&order=date&limit=20&offset=" + (page * 20));
  },
  getPastResults: (page: number = 0): Promise<Array<Record<string, Object>> | null> =>
    restFetch("matches?status=eq.已结束&order=date.desc&limit=20&offset=" + (page * 20)),
  getStandings: (league: string): Promise<Array<Record<string, Object>> | null> =>
    restFetch("standings?league=eq." + league + "&order=points.desc"),
  getTeams: (league: string): Promise<Array<Record<string, Object>> | null> =>
    restFetch("teams?league=eq." + league + "&order=name"),
  getNews: (page: number = 0): Promise<Array<Record<string, Object>> | null> =>
    restFetch("news?order=created_at.desc&limit=15&offset=" + (page * 15)),`,

  photo: `
  getDiscover: (page: number = 0): Promise<Array<Record<string, Object>> | null> =>
    restFetch("photos?order=likes.desc&limit=20&offset=" + (page * 20)),
  getByTag: (tag: string, page: number = 0): Promise<Array<Record<string, Object>> | null> =>
    restFetch("photos?tags=cs.{" + tag + "}&order=created_at.desc&limit=20&offset=" + (page * 20)),
  search: (q: string): Promise<Array<Record<string, Object>> | null> =>
    restFetch("photos?or=(caption.ilike.%25" + q + "%25,tags.ilike.%25" + q + "%25,location.ilike.%25" + q + "%25)&order=likes.desc&limit=30"),
  likePhoto: (photoId: string): Promise<Record<string, Object> | null> =>
    restFetch("rpc/increment_likes", { method: "POST", extraData: { photo_id: photoId } }),
  savePhoto: (photoId: string): Promise<Record<string, Object> | null> =>
    restFetch("saves", { method: "POST", extraData: { photo_id: photoId } }),
  getSavedPhotos: (): Promise<Array<Record<string, Object>> | null> =>
    restFetch("saves?select=*,photos(*)&order=created_at.desc"),
  getChallenges: (): Promise<Array<Record<string, Object>> | null> => restFetch("challenges?order=start_date.desc"),
  joinChallenge: (challengeId: string): Promise<Record<string, Object> | null> =>
    restFetch("challenge_participants", { method: "POST", extraData: { challenge_id: challengeId } }),`,

  dating: `
  discoverProfiles: (prefs: Record<string, Object>): Promise<Array<Record<string, Object>> | null> => {
    let q = "user_profiles?order=created_at.desc&limit=20";
    if (prefs.gender) q += "&gender=eq." + prefs.gender;
    if (prefs.minAge) q += "&age=gte." + prefs.minAge;
    if (prefs.maxAge) q += "&age=lte." + prefs.maxAge;
    return restFetch(q);
  },
  updateProfile: (data: Record<string, Object>): Promise<Record<string, Object> | null> =>
    restFetch("user_profiles", { method: "PATCH", extraData: data }),
  swipe: (targetUserId: string, direction: string): Promise<Record<string, Object> | null> =>
    restFetch("swipes", { method: "POST", extraData: { target_user_id: targetUserId, direction } }),
  getMatches: (): Promise<Array<Record<string, Object>> | null> => restFetch("matches?order=matched_at.desc"),
  unmatch: (matchId: string): Promise<Record<string, Object> | null> =>
    restFetch("matches?id=eq." + matchId, { method: "PATCH", extraData: { status: "已解除" } }),
  getInterests: (): Promise<Array<Record<string, Object>> | null> => restFetch("interests?order=name"),
  updateInterests: (interestIds: string): Promise<Record<string, Object> | null> =>
    restFetch("user_profiles", { method: "PATCH", extraData: { interests: interestIds } }),`,

  medical: `
  getDepartments: (): Promise<Array<Record<string, Object>> | null> => restFetch("departments?order=name"),
  getDoctorsByDept: (deptId: string, page: number = 0): Promise<Array<Record<string, Object>> | null> =>
    restFetch("doctors?department_id=eq." + deptId + "&order=rating.desc&limit=20&offset=" + (page * 20)),
  searchDoctors: (q: string): Promise<Array<Record<string, Object>> | null> =>
    restFetch("doctors?or=(name.ilike.%25" + q + "%25,hospital.ilike.%25" + q + "%25)&order=rating.desc&limit=20"),
  getDoctorSlots: (doctorId: string, date?: string): Promise<Array<Record<string, Object>> | null> => {
    const d = date || new Date().toISOString().substring(0, 10);
    return restFetch("appointment_slots?doctor_id=eq." + doctorId + "&date=eq." + d + "&available=eq.true&order=time");
  },
  makeAppointment: (data: Record<string, Object>): Promise<Record<string, Object> | null> =>
    restFetch("appointments", { method: "POST", extraData: data }),
  getMyAppointments: (): Promise<Array<Record<string, Object>> | null> =>
    restFetch("appointments?select=*,doctors(*)&order=date.desc"),
  cancelAppointment: (id: string): Promise<Record<string, Object> | null> =>
    restFetch("appointments?id=eq." + id, { method: "PATCH", extraData: { status: "已取消" } }),
  getMedicalRecords: (): Promise<Array<Record<string, Object>> | null> => restFetch("medical_records?order=date.desc"),`,

  blog: `
  getFeed: (page: number = 0): Promise<Array<Record<string, Object>> | null> =>
    restFetch("articles?order=created_at.desc&limit=15&offset=" + (page * 15)),
  getByCategory: (categoryId: string, page: number = 0): Promise<Array<Record<string, Object>> | null> =>
    restFetch("articles?category_id=eq." + categoryId + "&order=created_at.desc&limit=15&offset=" + (page * 15)),
  getCategories: (): Promise<Array<Record<string, Object>> | null> => restFetch("categories?order=sort_order"),
  search: (q: string): Promise<Array<Record<string, Object>> | null> =>
    restFetch("articles?or=(title.ilike.%25" + q + "%25,content.ilike.%25" + q + "%25,tags.ilike.%25" + q + "%25)&order=created_at.desc&limit=20"),
  getByAuthor: (authorId: string, page: number = 0): Promise<Array<Record<string, Object>> | null> =>
    restFetch("articles?author_id=eq." + authorId + "&order=created_at.desc&limit=15&offset=" + (page * 15)),
  bookmark: (articleId: string): Promise<Record<string, Object> | null> =>
    restFetch("bookmarks", { method: "POST", extraData: { article_id: articleId } }),
  getBookmarks: (): Promise<Array<Record<string, Object>> | null> =>
    restFetch("bookmarks?select=*,articles(*)&order=created_at.desc"),
  getReadingHistory: (): Promise<Array<Record<string, Object>> | null> =>
    restFetch("reading_history?order=read_at.desc&limit=30"),`,

  game: `
  getLeaderboard: (gameId: string, limit: number = 50): Promise<Array<Record<string, Object>> | null> =>
    restFetch("game_scores?game_id=eq." + gameId + "&order=score.desc&limit=" + limit),
  submitScore: (data: Record<string, Object>): Promise<Record<string, Object> | null> =>
    restFetch("game_scores", { method: "POST", extraData: { ...data, played_at: new Date().toISOString() } }),
  getMyScores: (gameId: string): Promise<Array<Record<string, Object>> | null> =>
    restFetch("game_scores?game_id=eq." + gameId + "&order=played_at.desc&limit=30"),
  getGames: (): Promise<Array<Record<string, Object>> | null> => restFetch("games?order=player_count.desc&limit=20"),
  getAchievements: (): Promise<Array<Record<string, Object>> | null> => restFetch("achievements?order=name"),
  unlockAchievement: (achievementId: string): Promise<Record<string, Object> | null> =>
    restFetch("user_achievements", { method: "POST", extraData: { achievement_id: achievementId } }),
  getMyAchievements: (): Promise<Array<Record<string, Object>> | null> =>
    restFetch("user_achievements?select=*,achievements(*)&order=unlocked_at.desc"),
  getMatchHistory: (): Promise<Array<Record<string, Object>> | null> =>
    restFetch("match_records?order=played_at.desc&limit=30"),`,

  payment: `
  getBalance: (): Promise<Record<string, Object> | null> =>
    restFetch("wallets?limit=1").then((r) => (r && r[0]) as Record<string, Object> | null || { balance: 0, currency: "CNY" }),
  getTransactions: (page: number = 0): Promise<Array<Record<string, Object>> | null> =>
    restFetch("transactions?order=date.desc&limit=20&offset=" + (page * 20)),
  getMonthlyStats: (month?: string): Promise<Array<Record<string, Object>> | null> => {
    const m = month || new Date().toISOString().substring(0, 7);
    return restFetch("transactions?date=gte." + m + "-01&date=lte." + m + "-31");
  },
  getPaymentMethods: (): Promise<Array<Record<string, Object>> | null> =>
    restFetch("payment_methods?order=is_default.desc"),
  addPaymentMethod: (data: Record<string, Object>): Promise<Record<string, Object> | null> =>
    restFetch("payment_methods", { method: "POST", extraData: data }),
  removePaymentMethod: (id: string): Promise<object | null> =>
    restFetch("payment_methods?id=eq." + id, { method: "DELETE" }),
  transfer: (toUser: string, amount: number, note: string): Promise<Record<string, Object> | null> =>
    restFetch("transactions", { method: "POST", extraData: { type: "transfer", to_user: toUser, amount, note, status: "completed" } }),`,
};

/**
 * P0-B-1: 生成 IndustryServices.ets — 19 行业差异化 Tier-1 服务层
 *
 * 每个 service 含基础 CRUD (list/get/create/update/remove) + 行业特有业务方法。
 * 对齐微信 services/industry.js 302 行差异化逻辑。
 */
export function emitHarmonyIndustryServicesEts(industry: IndustryCategory): string {
  const configs = listIndustryEmitConfigs();

  // 生成 19 个 service 导出（含差异化方法）
  const serviceBlocks = configs.map((cfg) => {
    const { id: name, tableName: table } = cfg;
    const extras = INDUSTRY_METHODS[name] || "";
    return `// ${name} Service — ${table}
export const ${name}Service = {
  list: (params?: string): Promise<Array<Record<string, Object>> | null> =>
    restFetch("${table}?order=created_at.desc&limit=50" + (params ? "&" + params : "")),
  get: (id: string): Promise<Record<string, Object> | null> =>
    restFetch("${table}?id=eq." + id + "&limit=1").then((r) => (r?.[0] ?? null) as Record<string, Object> | null),
  create: (data: Record<string, Object>): Promise<Record<string, Object> | null> =>
    restFetch("${table}", { method: "POST", extraData: data }),
  update: (id: string, data: Record<string, Object>): Promise<Record<string, Object> | null> =>
    restFetch("${table}?id=eq." + id, { method: "PATCH", extraData: data }),
  remove: (id: string): Promise<object | null> =>
    restFetch("${table}?id=eq." + id, { method: "DELETE" }),${extras}
};
`;
  }).join("\n");

  return `/**
 * App 生产工厂 — 鸿蒙 IndustryServices (P0-B-1: 19 行业差异化)
 * 对齐微信 services/industry.js — 每行业含基础 CRUD + 业务方法
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
export const DETECTED_INDUSTRY: string = '${industry}';
`;
}
