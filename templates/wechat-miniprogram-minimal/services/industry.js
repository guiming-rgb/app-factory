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

const socialService = {
  ...crud("posts"),
  getTopics: () => request("topics?order=post_count.desc"),
  getPostsByTopic: (topicId, page = 0) => request(`posts?topic_id=eq.${topicId}&order=created_at.desc&limit=20&offset=${page * 20}`),
  likePost: (postId) => request("posts", { method: "PATCH", data: { likes: 1 } }).then(() => request("rpc/increment_likes", { method: "POST", data: { post_id: postId } })).catch(() => null),
  addComment: (postId, content) => request("comments", { method: "POST", data: { post_id: postId, content } }),
  getComments: (postId) => request(`comments?post_id=eq.${postId}&order=created_at`),
  getFollowingPosts: (userIds) => request(`posts?user_id=in.(${userIds.join(",")})&order=created_at.desc&limit=30`),
  searchPosts: (q, page = 0) => request(`posts?or=(content.ilike.%25${q}%25,topic_id.ilike.%25${q}%25)&order=created_at.desc&limit=20&offset=${page * 20}`),
};

const foodService = {
  ...crud("restaurants"),
  getMenu: (rId) => request(`menu_items?restaurant_id=eq.${rId}&order=sales.desc`),
  searchRestaurants: (q) => request(`restaurants?or=(name.ilike.%25${q}%25,cuisine.ilike.%25${q}%25)&order=rating.desc&limit=30`),
  filterByCuisine: (cuisine) => request(`restaurants?cuisine=eq.${cuisine}&order=rating.desc&limit=30`),
  getCart: () => request("cart_items?select=*,menu_items(*)").then(cart => cart || []),
  addToCart: (menuItemId, qty = 1) => {
    return request(`cart_items?menu_item_id=eq.${menuItemId}&limit=1`).then(items => {
      if (items && items.length > 0) return request(`cart_items?id=eq.${items[0].id}`, { method: "PATCH", data: { qty: items[0].qty + qty } });
      return request("cart_items", { method: "POST", data: { menu_item_id: menuItemId, qty } });
    });
  },
  removeFromCart: (id) => request(`cart_items?id=eq.${id}`, { method: "DELETE" }),
  createOrder: (restaurantId, address) => {
    return foodService.getCart().then(cart => {
      if (!cart || cart.length === 0) throw new Error("购物车为空");
      const total = cart.reduce((s, c) => s + (c.menu_items?.price || 0) * c.qty, 0);
      return request("orders", { method: "POST", data: { restaurant_id: restaurantId, total, address, status: "已下单" } });
    });
  },
  getOrders: () => request("orders?order=created_at.desc"),
  getCoupons: () => request("coupons?expire_at=gte." + new Date().toISOString().slice(0, 10)),
  claimCoupon: (couponId) => request("coupons", { method: "POST", data: { coupon_id: couponId } }),
};

const hotelService = {
  ...crud("hotels"),
  search: ({ city, checkIn, checkOut, guests }) => {
    let q = `hotels?city=ilike.%25${city}%25`;
    if (guests) q += `&capacity=gte.${guests}`;
    return request(q + "&order=rating.desc&limit=30");
  },
  getRooms: (hotelId) => request(`room_types?hotel_id=eq.${hotelId}&order=price`),
  getAvailability: (roomId, checkIn, checkOut) => request(`bookings?room_id=eq.${roomId}&or=(check_in.lte.${checkOut},check_out.gte.${checkIn})`),
  bookRoom: (data) => request("bookings", { method: "POST", data }),
  getMyBookings: () => request("bookings?order=created_at.desc"),
  cancelBooking: (bookingId) => request(`bookings?id=eq.${bookingId}`, { method: "PATCH", data: { status: "已取消" } }),
  getReviews: (hotelId) => request(`reviews?hotel_id=eq.${hotelId}&order=created_at.desc&limit=20`),
  addReview: (data) => request("reviews", { method: "POST", data }),
};

const recruitmentService = {
  ...crud("jobs"),
  search: ({ keyword, location, salaryMin, exp }) => {
    let q = "jobs?order=created_at.desc&limit=30";
    if (keyword) q += `&or=(title.ilike.%25${keyword}%25,skills.ilike.%25${keyword}%25)`;
    if (location) q += `&location=ilike.%25${location}%25`;
    if (salaryMin) q += `&salary_min=gte.${salaryMin}`;
    return request(q);
  },
  getCompanies: (page = 0) => request(`companies?order=name&limit=20&offset=${page * 20}`),
  getCompanyJobs: (companyId) => request(`jobs?company_id=eq.${companyId}&order=created_at.desc`),
  apply: (data) => request("applications", { method: "POST", data }),
  getMyApplications: () => request("applications?order=created_at.desc"),
  getApplicationStatus: (id) => request(`applications?job_id=eq.${id}&limit=1`).then(r => (r || [])[0] || null),
  getRecommendedJobs: (skills) => {
    const filters = skills.map(s => `skills.ilike.%25${s}%25`).join(",");
    return request(`jobs?or=(${filters})&order=created_at.desc&limit=10`);
  },
};

const propertyService = {
  ...crud("repairs"),
  submitRepair: (data) => request("repairs", { method: "POST", data: { ...data, status: "待处理" } }),
  getMyRepairs: () => request("repairs?order=created_at.desc"),
  getRepairStatus: (id) => request(`repairs?id=eq.${id}&limit=1`).then(r => (r || [])[0] || null),
  getNotices: () => request("notices?order=created_at.desc&limit=20"),
  getImportantNotices: () => request("notices?importance=eq.紧急&order=created_at.desc&limit=5"),
  getPayments: () => request("payments?order=period.desc"),
  payBill: (paymentId) => request(`payments?id=eq.${paymentId}`, { method: "PATCH", data: { status: "已缴" } }),
  registerVisitor: (data) => request("visitors", { method: "POST", data: { ...data, status: "待审批" } }),
  getVisitors: () => request("visitors?order=visit_date.desc"),
  getFacilities: () => request("facilities?order=name"),
  bookFacility: (facilityId, date, timeSlot) => request("facility_bookings", { method: "POST", data: { facility_id: facilityId, date, time_slot: timeSlot } }),
};

const videoService = {
  ...crud("videos"),
  getByCategory: (category, page = 0) => request(`videos?category=eq.${category}&order=views.desc&limit=20&offset=${page * 20}`),
  getTrending: () => request("videos?order=views.desc&limit=20"),
  search: (q) => request(`videos?or=(title.ilike.%25${q}%25,description.ilike.%25${q}%25)&order=views.desc&limit=30`),
  getFavorites: () => request("favorites?select=*,videos(*)&order=created_at.desc"),
  addFavorite: (vId) => request("favorites", { method: "POST", data: { video_id: vId } }),
  removeFavorite: (vId) => request(`favorites?video_id=eq.${vId}`, { method: "DELETE" }),
  getWatchHistory: () => request("watch_history?order=watched_at.desc&limit=30"),
  getRecommendations: () => request("videos?order=rating.desc&limit=10"),
  incrementViews: (vId) => request("rpc/increment_views", { method: "POST", data: { video_id: vId } }).catch(() => null),
};

const weatherService = {
  ...crud("cities"),
  setCurrentCity: (cityId) => request(`cities?id=eq.${cityId}`, { method: "PATCH", data: { is_current: true } }),
  getCurrentCity: () => request("cities?is_current=eq.true&limit=1").then(r => (r || [])[0] || null),
  getCityList: () => request("cities?order=name"),
  removeCity: (cityId) => request(`cities?id=eq.${cityId}`, { method: "DELETE" }),
  getHourly: (cityId, date) => {
    const d = date || new Date().toISOString().slice(0, 10);
    return request(`forecasts?city_id=eq.${cityId}&date=eq.${d}&order=time&limit=24`);
  },
  getDaily: (cityId, days = 7) => {
    const today = new Date().toISOString().slice(0, 10);
    const end = new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
    return request(`forecasts?city_id=eq.${cityId}&date=gte.${today}&date=lte.${end}&order=date&limit=${days}`);
  },
  getAqi: (cityId) => request(`aqi_data?city_id=eq.${cityId}&order=measured_at.desc&limit=1`).then(r => (r || [])[0] || null),
  getLifeIndex: (cityId) => request(`life_indices?city_id=eq.${cityId}&order=date.desc&limit=1`).then(r => (r || [])[0] || null),
  getExternalForecast: (lat, lon) => {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max&forecast_days=7&timezone=auto`;
    return request(url).catch(() => null);
  },
};

const sportsService = {
  ...crud("matches"),
  getLiveMatches: () => request("matches?status=eq.进行中&order=date"),
  getUpcoming: (page = 0) => request(`matches?date=gte.${new Date().toISOString().slice(0, 10)}&order=date&limit=20&offset=${page * 20}`),
  getPastResults: (page = 0) => request(`matches?status=eq.已结束&order=date.desc&limit=20&offset=${page * 20}`),
  getMatchesByTeam: (teamId) => request(`matches?or=(home_team_id.eq.${teamId},away_team_id.eq.${teamId})&order=date.desc&limit=30`),
  getStandings: (league) => request(`standings?league=eq.${league}&order=points.desc`),
  getTeams: (league) => request(`teams?league=eq.${league}&order=name`),
  getTeamDetail: (teamId) => request(`teams?id=eq.${teamId}&limit=1`).then(r => (r || [])[0] || null),
  getNews: (page = 0) => request(`news?order=created_at.desc&limit=15&offset=${page * 15}`),
  getNewsByTeam: (teamId) => request(`news?team_id=eq.${teamId}&order=created_at.desc&limit=10`),
};

const photoService = {
  ...crud("photos"),
  getDiscover: (page = 0) => request(`photos?order=likes.desc&limit=20&offset=${page * 20}`),
  getByTag: (tag, page = 0) => request(`photos?tags=cs.{${tag}}&order=created_at.desc&limit=20&offset=${page * 20}`),
  search: (q) => request(`photos?or=(caption.ilike.%25${q}%25,tags.ilike.%25${q}%25,location.ilike.%25${q}%25)&order=likes.desc&limit=30`),
  likePhoto: (photoId) => request("rpc/increment_likes", { method: "POST", data: { photo_id: photoId } }).catch(() => null),
  savePhoto: (photoId) => request("saves", { method: "POST", data: { photo_id: photoId } }),
  getSavedPhotos: () => request("saves?select=*,photos(*)&order=created_at.desc"),
  getChallenges: () => request("challenges?order=start_date.desc"),
  joinChallenge: (challengeId) => request("challenge_participants", { method: "POST", data: { challenge_id: challengeId } }),
  getUserPhotos: (userId) => request(`photos?user_id=eq.${userId}&order=created_at.desc&limit=30`),
};

const datingService = {
  ...crud("user_profiles"),
  discoverProfiles: (prefs) => {
    let q = "user_profiles?order=created_at.desc&limit=20";
    if (prefs?.gender) q += `&gender=eq.${prefs.gender}`;
    if (prefs?.minAge) q += `&age=gte.${prefs.minAge}`;
    if (prefs?.maxAge) q += `&age=lte.${prefs.maxAge}`;
    return request(q);
  },
  updateProfile: (data) => request("user_profiles", { method: "PATCH", data }),
  swipe: (targetUserId, direction) => request("swipes", { method: "POST", data: { target_user_id: targetUserId, direction } }),
  getMatches: () => request("matches?order=matched_at.desc"),
  unmatch: (matchId) => request(`matches?id=eq.${matchId}`, { method: "PATCH", data: { status: "已解除" } }),
  getInterests: () => request("interests?order=name"),
  updateInterests: (interestIds) => request("user_profiles", { method: "PATCH", data: { interests: interestIds } }),
};

const medicalService = {
  ...crud("doctors"),
  getDepartments: () => request("departments?order=name"),
  getDoctorsByDept: (deptId, page = 0) => request(`doctors?department_id=eq.${deptId}&order=rating.desc&limit=20&offset=${page * 20}`),
  searchDoctors: (q) => request(`doctors?or=(name.ilike.%25${q}%25,hospital.ilike.%25${q}%25,department_id.ilike.%25${q}%25)&order=rating.desc&limit=20`),
  getDoctorSlots: (doctorId, date) => {
    const d = date || new Date().toISOString().slice(0, 10);
    return request(`appointment_slots?doctor_id=eq.${doctorId}&date=eq.${d}&available=eq.true&order=time`);
  },
  makeAppointment: (data) => request("appointments", { method: "POST", data }),
  getMyAppointments: () => request("appointments?select=*,doctors(*)&order=date.desc"),
  cancelAppointment: (id) => request(`appointments?id=eq.${id}`, { method: "PATCH", data: { status: "已取消" } }),
  getMedicalRecords: () => request("medical_records?order=date.desc"),
  addMedicalRecord: (data) => request("medical_records", { method: "POST", data }),
};

const blogService = {
  ...crud("articles"),
  getFeed: (page = 0) => request(`articles?order=created_at.desc&limit=15&offset=${page * 15}`),
  getByCategory: (categoryId, page = 0) => request(`articles?category_id=eq.${categoryId}&order=created_at.desc&limit=15&offset=${page * 15}`),
  search: (q) => request(`articles?or=(title.ilike.%25${q}%25,content.ilike.%25${q}%25,tags.ilike.%25${q}%25)&order=created_at.desc&limit=20`),
  getCategories: () => request("categories?order=sort_order"),
  getByAuthor: (authorId, page = 0) => request(`articles?author_id=eq.${authorId}&order=created_at.desc&limit=15&offset=${page * 15}`),
  bookmark: (articleId) => request("bookmarks", { method: "POST", data: { article_id: articleId } }),
  unbookmark: (articleId) => request(`bookmarks?article_id=eq.${articleId}`, { method: "DELETE" }),
  getBookmarks: () => request("bookmarks?select=*,articles(*)&order=created_at.desc"),
  getReadingHistory: () => request("reading_history?order=read_at.desc&limit=30"),
};

const gameService = {
  ...crud("game_scores"),
  getLeaderboard: (gameId, limit = 50) => request(`game_scores?game_id=eq.${gameId}&order=score.desc&limit=${limit}`),
  submitScore: (data) => request("game_scores", { method: "POST", data: { ...data, played_at: new Date().toISOString() } }),
  getMyScores: (gameId) => request(`game_scores?game_id=eq.${gameId}&order=played_at.desc&limit=30`),
  getGames: () => request("games?order=player_count.desc&limit=20"),
  getAchievements: () => request("achievements?order=name"),
  unlockAchievement: (achievementId) => request("user_achievements", { method: "POST", data: { achievement_id: achievementId } }),
  getMyAchievements: () => request("user_achievements?select=*,achievements(*)&order=unlocked_at.desc"),
  getMatchHistory: () => request("match_records?order=played_at.desc&limit=30"),
};

const paymentService = {
  ...crud("orders"),
  getBalance: () => request("wallets?limit=1").then(r => (r || [])[0] || { balance: 0, currency: "CNY" }),
  createPayment: (data) => request("orders", { method: "POST", data: { ...data, status: "pending" } }),
  getTransactions: (page = 0) => request(`transactions?order=date.desc&limit=20&offset=${page * 20}`),
  getTransactionDetail: (id) => request(`transactions?id=eq.${id}&limit=1`).then(r => (r || [])[0] || null),
  getPaymentMethods: () => request("payment_methods?order=is_default.desc"),
  setDefaultMethod: (methodId) => request("payment_methods", { method: "POST", data: { rpc: "set_default", method_id: methodId } }),
  addPaymentMethod: (data) => request("payment_methods", { method: "POST", data }),
  removePaymentMethod: (id) => request(`payment_methods?id=eq.${id}`, { method: "DELETE" }),
  transfer: (toUser, amount, note) => request("transactions", { method: "POST", data: { type: "transfer", to_user: toUser, amount, note, status: "completed" } }),
  getMonthlyStats: (month) => {
    const m = month || new Date().toISOString().slice(0, 7);
    return request(`transactions?date=gte.${m}-01&date=lte.${m}-31`);
  },
};

module.exports = {
  financeService, crmService, fitnessService, ecommerceService, educationService,
  socialService, foodService, hotelService, recruitmentService, propertyService,
  videoService, weatherService, sportsService, photoService, datingService,
  medicalService, blogService, gameService, paymentService
};
