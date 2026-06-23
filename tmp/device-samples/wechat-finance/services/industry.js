/**
 * 微信小程序 — 19 行业通用 Supabase REST 服务层
 * 使用方式: const { financeService } = require('../../services/industry');
 */
const { request } = require("../utils/supabase");

// ── 通用查询工具 ──────────────────
function crud(table) {
  return {
    list: (params = "") => request(`${table}?order=created_at.desc&limit=50${params ? "&" + params : ""}`),
    get: (id) => request(`${table}?id=eq.${id}&limit=1`).then(r => (r || [])[0] || null),
    create: (data) => request(table, { method: "POST", data }),
    update: (id, data) => request(`${table}?id=eq.${id}`, { method: "PATCH", data }),
    remove: (id) => request(`${table}?id=eq.${id}`, { method: "DELETE" }),
  };
}

// ── 19 行业服务 ──────────────────
const financeService = {
  ...crud("transactions"),
  getMonthlySummary: (month) => {
    const m = month || new Date().toISOString().slice(0, 7);
    return request(`transactions?created_at=gte.${m}-01&created_at=lte.${m}-31`);
  },
  getBudgets: () => request("budgets"),
  getAccounts: () => request("accounts"),
};

const crmService = {
  ...crud("contacts"),
  getPipeline: () => request("contacts?order=stage"),
  getActivities: (contactId) => request(`activities?contact_id=eq.${contactId}&order=created_at.desc`),
  addActivity: (data) => request("activities", { method: "POST", data }),
};

const fitnessService = {
  ...crud("workouts"),
  getBodyStats: () => request("body_stats?order=recorded_at.desc&limit=30"),
  addBodyStat: (data) => request("body_stats", { method: "POST", data }),
};

const ecommerceService = {
  ...crud("products"),
  getCart: () => request("cart_items?select=*,products(*)"),
  addToCart: (productId, qty = 1) => {
    return request("cart_items?product_id=eq." + productId + "&limit=1").then(items => {
      if (items && items.length > 0) {
        return request("cart_items?id=eq." + items[0].id, { method: "PATCH", data: { qty: items[0].qty + qty } });
      }
      return request("cart_items", { method: "POST", data: { product_id: productId, qty } });
    });
  },
  getOrders: () => request("orders?order=created_at.desc"),
  createOrder: (address) => {
    return ecommerceService.getCart().then(cart => {
      if (!cart || cart.length === 0) throw new Error("购物车为空");
      const total = cart.reduce((s, c) => s + (c.products?.price || 0) * c.qty, 0);
      return request("orders", { method: "POST", data: { total, address, items: cart } });
    });
  },
};

const educationService = {
  ...crud("courses"),
  getAssignments: (courseId) => request(`assignments?course_id=eq.${courseId}&order=deadline`),
  getGrades: (courseId) => request(`grades?course_id=eq.${courseId}&order=created_at.desc`),
  getTodaySchedule: () => {
    const today = new Date().getDay(); // 0=Sun
    return request(`courses?day_of_week=eq.${today}&order=start_time`);
  },
};

const socialService = { ...crud("posts"), getTopics: () => request("topics") };
const foodService = { ...crud("restaurants"), getMenu: (rId) => request(`menu_items?restaurant_id=eq.${rId}`) };
const hotelService = { ...crud("hotels"), bookRoom: (data) => request("bookings", { method: "POST", data }) };
const recruitmentService = { ...crud("jobs"), apply: (data) => request("applications", { method: "POST", data }) };
const propertyService = { ...crud("repairs"), getNotices: () => request("notices?order=created_at.desc&limit=20") };
const videoService = { ...crud("videos"), addFavorite: (vId) => request("favorites", { method: "POST", data: { video_id: vId } }) };
const weatherService = { ...crud("cities"), getForecast: (lat, lon) => request(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m&daily=temperature_2m_max,temperature_2m_min&forecast_days=3&timezone=auto`).catch(() => null) };
const sportsService = { ...crud("matches"), getStandings: (league) => request(`standings?league=eq.${league}&order=points.desc`) };
const photoService = { ...crud("photos") };
const datingService = { ...crud("user_profiles") };
const medicalService = { ...crud("doctors"), makeAppointment: (data) => request("appointments", { method: "POST", data }) };
const blogService = { ...crud("articles"), getCategories: () => request("categories") };
const gameService = { ...crud("game_scores"), getLeaderboard: () => request("game_scores?order=score.desc&limit=20") };
const paymentService = { ...crud("orders"), createPayment: (data) => request("orders", { method: "POST", data }) };

module.exports = {
  financeService, crmService, fitnessService, ecommerceService, educationService,
  socialService, foodService, hotelService, recruitmentService, propertyService,
  videoService, weatherService, sportsService, photoService, datingService,
  medicalService, blogService, gameService, paymentService
};
