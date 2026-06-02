import type { AppSpec } from "./types";

/** 17 套对标竞品深度打磨模板 */
export type SpecTemplate = { id: string; name: string; description: string; category: string; icon: string; spec: AppSpec; };

function base(appName: string, displayName: string, screens: AppSpec["screens"], entities: AppSpec["entities"], tabs: string[], limits: string[], theme?: string): AppSpec {
  return { specVersion: "0.1.0", appName, displayName, screens, entities, navigation: { tabs }, targets: { flutter: { enabled: true, platforms: ["ios","android","web"], formFactors: ["phone"] }, backend: { provider: "supabase" }, harmony: { enabled: true, formFactors: ["phone"] }, wechatMiniProgram: { enabled: true } }, limitations: limits, layoutRules: { theme: theme || "teal" } };
}

function f(name: string, type: string, primary?: boolean) { return { name, type, ...(primary ? { primary } : {}) }; }

export const TEMPLATE_LIBRARY: SpecTemplate[] = [
  // 1. 电商 — 对标淘宝/拼多多/京东
  { id: "ecommerce", name: "电商商城", description: "分类浏览+商品搜索+购物车+下单+订单跟踪+评价", category: "电商", icon: "🛒",
    spec: base("shop","电商商城",[
      {id:"home",title:"首页",type:"placeholder"},{id:"category_list",title:"分类",type:"list",entity:"category"},{id:"product_list",title:"商品",type:"list",entity:"product"},{id:"product_detail",title:"详情",type:"detail",entity:"product"},{id:"cart",title:"购物车",type:"list",entity:"cart_item"},{id:"checkout",title:"结算",type:"payment"},{id:"order_list",title:"订单",type:"list",entity:"order"},{id:"profile",title:"我的",type:"placeholder"}
    ], [
      {name:"category",fields:[f("id","uuid",true),f("name","string"),f("icon","image"),f("sort_order","int")]},
      {name:"product",fields:[f("id","uuid",true),f("category_id","uuid"),f("name","string"),f("price","float"),f("original_price","float"),f("images","json"),f("description","string"),f("sales","int"),f("rating","float"),f("stock","int")],relations:[{target:"category",type:"belongs_to"}]},
      {name:"cart_item",fields:[f("id","uuid",true),f("user_id","uuid"),f("product_id","uuid"),f("qty","int"),f("selected","bool")],relations:[{target:"product",type:"belongs_to"}]},
      {name:"order",fields:[f("id","uuid",true),f("user_id","uuid"),f("total","float"),f("status","string"),f("address","string"),f("tracking_number","string")]},
    ],["home","category_list","cart","profile"],["支付需Stripe配置","商品图片需CDN"])},
  // 2. 社交 — 对标小红书/微博/朋友圈
  { id: "social", name: "社交社区", description: "图文动态+话题标签+点赞评论转发+关注+聊天", category: "社交", icon: "💬",
    spec: base("social","社交社区",[
      {id:"feed",title:"发现",type:"list",entity:"post"},{id:"post_detail",title:"详情",type:"detail",entity:"post"},{id:"create_post",title:"发布",type:"form",entity:"post"},{id:"topic_list",title:"话题",type:"list",entity:"topic"},{id:"chat_list",title:"消息",type:"chat"},{id:"profile",title:"我的",type:"placeholder"}
    ], [
      {name:"post",fields:[f("id","uuid",true),f("user_id","uuid"),f("content","string"),f("images","json"),f("topic_id","uuid"),f("likes","int"),f("comments","int"),f("shares","int")],relations:[{target:"topic",type:"belongs_to"}]},
      {name:"topic",fields:[f("id","uuid",true),f("name","string"),f("cover","image"),f("post_count","int")]},
    ],["feed","topic_list","chat_list","profile"],["聊天需Realtime","视频需CDN"])},
  // 3. CRM — 对标 Salesforce/纷享销客
  { id: "crm", name: "客户管理", description: "客户+联系人+销售机会+跟进记录+销售漏斗", category: "企业", icon: "📊",
    spec: base("crm","CRM",[
      {id:"client_list",title:"客户",type:"list",entity:"client"},{id:"client_detail",title:"详情",type:"detail",entity:"client"},{id:"add_client",title:"添加",type:"form",entity:"client"},{id:"opportunity_list",title:"商机",type:"list",entity:"opportunity"},{id:"activity_list",title:"动态",type:"list",entity:"activity"},{id:"dashboard",title:"统计",type:"placeholder"},{id:"profile",title:"我的",type:"placeholder"}
    ], [
      {name:"client",fields:[f("id","uuid",true),f("name","string"),f("industry","string"),f("phone","string"),f("email","string"),f("source","string"),f("stage","string")]},
      {name:"opportunity",fields:[f("id","uuid",true),f("client_id","uuid"),f("name","string"),f("amount","float"),f("stage","string"),f("close_date","datetime"),f("probability","int")],relations:[{target:"client",type:"belongs_to"}]},
      {name:"activity",fields:[f("id","uuid",true),f("client_id","uuid"),f("type","string"),f("content","string"),f("next_remind","datetime")],relations:[{target:"client",type:"belongs_to"}]},
    ],["client_list","opportunity_list","dashboard","profile"],["图表需自定义","邮件集成需第三方"])},
  // 4. 博客 — 对标 Medium/知乎/简书
  { id: "blog", name: "博客阅读", description: "推荐+分类标签+收藏+历史+作者关注", category: "内容", icon: "📝",
    spec: base("blog","博客",[
      {id:"feed",title:"推荐",type:"list",entity:"article"},{id:"article_detail",title:"阅读",type:"detail",entity:"article"},{id:"category_list",title:"分类",type:"list",entity:"category"},{id:"bookmarks",title:"收藏",type:"list",entity:"article"},{id:"search",title:"搜索",type:"placeholder"},{id:"profile",title:"我的",type:"placeholder"}
    ], [
      {name:"category",fields:[f("id","uuid",true),f("name","string"),f("icon","image")]},
      {name:"article",fields:[f("id","uuid",true),f("author_id","uuid"),f("title","string"),f("summary","string"),f("content","string"),f("cover","image"),f("category_id","uuid"),f("tags","json"),f("read_minutes","int"),f("likes","int"),f("bookmarks","int")],relations:[{target:"category",type:"belongs_to"}]},
    ],["feed","category_list","bookmarks","profile"],["富文本编辑器需额外组件"])},
  // 5. 健身 — 对标 Keep/MyFitnessPal
  { id: "fitness", name: "健身助手", description: "训练课程+动作库+打卡+身体数据+成就", category: "健康", icon: "💪",
    spec: base("fitness","健身助手",[
      {id:"today",title:"今日",type:"placeholder"},{id:"course_list",title:"课程",type:"list",entity:"course"},{id:"exercise_lib",title:"动作库",type:"list",entity:"exercise"},{id:"workout_log",title:"记录",type:"list",entity:"workout"},{id:"body_stats",title:"身体",type:"list",entity:"body_measure"},{id:"profile",title:"我的",type:"placeholder"}
    ], [
      {name:"course",fields:[f("id","uuid",true),f("name","string"),f("level","string"),f("duration_min","int"),f("calories","int"),f("cover","image")]},
      {name:"exercise",fields:[f("id","uuid",true),f("name","string"),f("body_part","string"),f("gif_url","image"),f("instructions","string")]},
      {name:"workout",fields:[f("id","uuid",true),f("user_id","uuid"),f("course_id","uuid"),f("duration_min","int"),f("calories","int"),f("date","datetime")],relations:[{target:"course",type:"belongs_to"}]},
      {name:"body_measure",fields:[f("id","uuid",true),f("user_id","uuid"),f("weight","float"),f("body_fat","float"),f("chest","float"),f("waist","float"),f("date","datetime")]},
    ],["today","course_list","workout_log","profile"],["动作GIF需CDN","图表需额外开发"])},
  // 6. 外卖 — 对标 美团/Uber Eats
  { id: "food_delivery", name: "外卖点餐", description: "餐厅搜索+菜单+购物车+优惠券+订单跟踪+评价", category: "电商", icon: "🍕",
    spec: base("food_delivery","外卖",[
      {id:"home",title:"首页",type:"placeholder"},{id:"restaurant_list",title:"商家",type:"list",entity:"restaurant"},{id:"menu",title:"点餐",type:"list",entity:"menu_item"},{id:"cart",title:"购物车",type:"list",entity:"cart_item"},{id:"order_list",title:"订单",type:"list",entity:"order"},{id:"coupon_list",title:"优惠券",type:"list",entity:"coupon"},{id:"profile",title:"我的",type:"placeholder"}
    ], [
      {name:"restaurant",fields:[f("id","uuid",true),f("name","string"),f("cuisine","string"),f("rating","float"),f("delivery_time","int"),f("delivery_fee","float"),f("min_order","float"),f("logo","image")]},
      {name:"menu_item",fields:[f("id","uuid",true),f("restaurant_id","uuid"),f("name","string"),f("price","float"),f("image","image"),f("description","string"),f("sales","int")],relations:[{target:"restaurant",type:"belongs_to"}]},
      {name:"cart_item",fields:[f("id","uuid",true),f("user_id","uuid"),f("menu_item_id","uuid"),f("qty","int")],relations:[{target:"menu_item",type:"belongs_to"}]},
      {name:"order",fields:[f("id","uuid",true),f("user_id","uuid"),f("restaurant_id","uuid"),f("total","float"),f("status","string"),f("rider_name","string"),f("eta_min","int")],relations:[{target:"restaurant",type:"belongs_to"}]},
      {name:"coupon",fields:[f("id","uuid",true),f("user_id","uuid"),f("code","string"),f("discount","float"),f("min_order","float"),f("expire_at","datetime")]},
    ],["home","restaurant_list","order_list","profile"],["支付需Stripe","实时配送需第三方"])},
  // 7. 酒店 — 对标 携程/Booking
  { id: "hotel_booking", name: "酒店预订", description: "搜索+筛选+详情+房型+日期+订单+评价", category: "旅游", icon: "🏨",
    spec: base("hotel_booking","酒店",[
      {id:"search",title:"搜索",type:"placeholder"},{id:"hotel_list",title:"酒店",type:"list",entity:"hotel"},{id:"hotel_detail",title:"详情",type:"detail",entity:"hotel"},{id:"booking",title:"预订",type:"form",entity:"booking"},{id:"my_bookings",title:"订单",type:"list",entity:"booking"},{id:"profile",title:"我的",type:"placeholder"}
    ], [
      {name:"hotel",fields:[f("id","uuid",true),f("name","string"),f("city","string"),f("address","string"),f("stars","int"),f("rating","float"),f("price_from","float"),f("images","json"),f("amenities","json"),f("latitude","float"),f("longitude","float")]},
      {name:"booking",fields:[f("id","uuid",true),f("user_id","uuid"),f("hotel_id","uuid"),f("room_type","string"),f("check_in","date"),f("check_out","date"),f("guests","int"),f("total_price","float"),f("status","string")],relations:[{target:"hotel",type:"belongs_to"}]},
    ],["search","hotel_list","my_bookings","profile"],["真实酒店数据需第三方API"])},
  // 8. 招聘 — 对标 BOSS直聘/LinkedIn
  { id: "recruitment", name: "招聘求职", description: "职位搜索+公司主页+投递+沟通+简历", category: "企业", icon: "💼",
    spec: base("recruitment","招聘",[
      {id:"job_list",title:"职位",type:"list",entity:"job"},{id:"job_detail",title:"详情",type:"detail",entity:"job"},{id:"company_list",title:"公司",type:"list",entity:"company"},{id:"apply",title:"投递",type:"form",entity:"application"},{id:"my_applications",title:"我的投递",type:"list",entity:"application"},{id:"chat",title:"沟通",type:"chat"},{id:"profile",title:"我的",type:"placeholder"}
    ], [
      {name:"company",fields:[f("id","uuid",true),f("name","string"),f("industry","string"),f("size","string"),f("logo","image"),f("description","string")]},
      {name:"job",fields:[f("id","uuid",true),f("company_id","uuid"),f("title","string"),f("salary_min","float"),f("salary_max","float"),f("location","string"),f("experience","string"),f("education","string"),f("skills","json")],relations:[{target:"company",type:"belongs_to"}]},
      {name:"application",fields:[f("id","uuid",true),f("user_id","uuid"),f("job_id","uuid"),f("resume_url","file"),f("status","string")],relations:[{target:"job",type:"belongs_to"}]},
    ],["job_list","company_list","chat","profile"],["在线沟通需Realtime","简历解析需第三方"])},
  // 9. 物业 — 对标 彩生活/碧桂园服务
  { id: "property", name: "智慧物业", description: "报修+缴费+访客+公告+设施预约+管家", category: "企业", icon: "🏠",
    spec: base("property","物业",[
      {id:"home",title:"首页",type:"placeholder"},{id:"repair_list",title:"报修",type:"list",entity:"repair"},{id:"payment_list",title:"缴费",type:"list",entity:"payment"},{id:"notice_list",title:"公告",type:"list",entity:"notice"},{id:"visitor_list",title:"访客",type:"list",entity:"visitor"},{id:"facility_book",title:"预约",type:"list",entity:"facility"},{id:"profile",title:"我的",type:"placeholder"}
    ], [
      {name:"repair",fields:[f("id","uuid",true),f("user_id","uuid"),f("title","string"),f("description","string"),f("images","json"),f("status","string"),f("urgency","string")]},
      {name:"payment",fields:[f("id","uuid",true),f("user_id","uuid"),f("type","string"),f("amount","float"),f("period","string"),f("status","string")]},
      {name:"notice",fields:[f("id","uuid",true),f("title","string"),f("content","string"),f("importance","string")]},
      {name:"visitor",fields:[f("id","uuid",true),f("user_id","uuid"),f("name","string"),f("phone","string"),f("visit_date","datetime"),f("status","string")]},
      {name:"facility",fields:[f("id","uuid",true),f("name","string"),f("type","string"),f("capacity","int")]},
    ],["home","repair_list","notice_list","profile"],["支付需对接物业系统"])},
  // 10. 课程 — 对标 超级课程表/Google Classroom
  { id: "schedule", name: "课程助手", description: "周视图课表+作业+考试+成绩+签到", category: "教育", icon: "📚",
    spec: base("schedule","课程助手",[
      {id:"timetable",title:"课表",type:"placeholder"},{id:"course_list",title:"课程",type:"list",entity:"course"},{id:"homework_list",title:"作业",type:"list",entity:"homework"},{id:"exam_list",title:"考试",type:"list",entity:"exam"},{id:"grade_list",title:"成绩",type:"list",entity:"grade"},{id:"profile",title:"我的",type:"placeholder"}
    ], [
      {name:"course",fields:[f("id","uuid",true),f("name","string"),f("teacher","string"),f("classroom","string"),f("day_of_week","int"),f("start_time","string"),f("end_time","string"),f("color","string")]},
      {name:"homework",fields:[f("id","uuid",true),f("course_id","uuid"),f("title","string"),f("description","string"),f("due_date","datetime"),f("status","string"),f("attachment","file")],relations:[{target:"course",type:"belongs_to"}]},
      {name:"exam",fields:[f("id","uuid",true),f("course_id","uuid"),f("name","string"),f("date","datetime"),f("location","string"),f("duration_min","int")],relations:[{target:"course",type:"belongs_to"}]},
      {name:"grade",fields:[f("id","uuid",true),f("course_id","uuid"),f("user_id","uuid"),f("score","float"),f("total","float"),f("type","string")],relations:[{target:"course",type:"belongs_to"}]},
    ],["timetable","homework_list","exam_list","profile"],["周视图需自定义组件","推送需额外配置"])},
  // 11. 影音 — 对标 Netflix/腾讯视频
  { id: "entertainment", name: "影音娱乐", description: "分类+推荐+搜索+播放器+收藏+历史", category: "内容", icon: "🎬",
    spec: base("entertainment","影音",[
      {id:"home",title:"首页",type:"placeholder"},{id:"video_list",title:"分类",type:"list",entity:"video"},{id:"video_detail",title:"播放",type:"detail",entity:"video"},{id:"search",title:"搜索",type:"placeholder"},{id:"favorites",title:"收藏",type:"list",entity:"video"},{id:"history",title:"历史",type:"list",entity:"video"},{id:"profile",title:"我的",type:"placeholder"}
    ], [
      {name:"video",fields:[f("id","uuid",true),f("title","string"),f("description","string"),f("url","string"),f("thumbnail","image"),f("duration","int"),f("category","string"),f("views","int"),f("rating","float")]},
    ],["home","video_list","favorites","profile"],["视频CDN需第三方","DRM需额外开发"])},
  // 12. 记账 — 对标 随手记/Mint/YNAB
  { id: "finance_tracker", name: "记账理财", description: "收支记录+多账户+预算+报表+提醒", category: "金融", icon: "💰",
    spec: base("finance_tracker","记账本",[
      {id:"home",title:"总览",type:"placeholder"},{id:"transaction_list",title:"账单",type:"list",entity:"transaction"},{id:"add_transaction",title:"记一笔",type:"form",entity:"transaction"},{id:"account_list",title:"账户",type:"list",entity:"account"},{id:"budget_list",title:"预算",type:"list",entity:"budget"},{id:"report",title:"报表",type:"placeholder"},{id:"profile",title:"我的",type:"placeholder"}
    ], [
      {name:"account",fields:[f("id","uuid",true),f("user_id","uuid"),f("name","string"),f("type","string"),f("balance","float"),f("currency","string"),f("icon","string")]},
      {name:"transaction",fields:[f("id","uuid",true),f("user_id","uuid"),f("account_id","uuid"),f("amount","float"),f("type","string"),f("category","string"),f("note","string"),f("date","datetime")],relations:[{target:"account",type:"belongs_to"}]},
      {name:"budget",fields:[f("id","uuid",true),f("user_id","uuid"),f("category","string"),f("limit_amount","float"),f("spent","float"),f("month","string")]},
    ],["home","transaction_list","report","profile"],["图表需自定义","银行同步需Plaid"])},
  // 13. 医疗 — 对标 平安好医生/春雨医生
  { id: "medical_appointment", name: "在线问诊", description: "科室+医生筛选+预约+问诊+处方+病历", category: "医疗", icon: "🏥",
    spec: base("medical_app","在线问诊",[
      {id:"home",title:"首页",type:"placeholder"},{id:"department_list",title:"科室",type:"list",entity:"department"},{id:"doctor_list",title:"医生",type:"list",entity:"doctor"},{id:"doctor_detail",title:"详情",type:"detail",entity:"doctor"},{id:"appointment",title:"预约",type:"form",entity:"appointment"},{id:"my_appointments",title:"我的预约",type:"list",entity:"appointment"},{id:"records",title:"病历",type:"list",entity:"medical_record"},{id:"profile",title:"我的",type:"placeholder"}
    ], [
      {name:"department",fields:[f("id","uuid",true),f("name","string"),f("icon","string"),f("description","string")]},
      {name:"doctor",fields:[f("id","uuid",true),f("department_id","uuid"),f("name","string"),f("title","string"),f("hospital","string"),f("rating","float"),f("consultation_fee","float"),f("avatar","image"),f("bio","string")],relations:[{target:"department",type:"belongs_to"}]},
      {name:"appointment",fields:[f("id","uuid",true),f("user_id","uuid"),f("doctor_id","uuid"),f("date","datetime"),f("type","string"),f("status","string")],relations:[{target:"doctor",type:"belongs_to"}]},
      {name:"medical_record",fields:[f("id","uuid",true),f("user_id","uuid"),f("doctor_id","uuid"),f("diagnosis","string"),f("prescription","string"),f("date","datetime")],relations:[{target:"doctor",type:"belongs_to"}]},
    ],["home","department_list","my_appointments","profile"],["视频问诊需WebRTC","处方合规需医疗资质"])},
  // 14. 天气 — 对标 墨迹天气/Weather.com
  { id: "weather", name: "天气预报", description: "实时+逐小时+15日+空气质量+生活指数+多城市", category: "工具", icon: "🌤️",
    spec: base("weather","天气",[
      {id:"today",title:"今日",type:"placeholder"},{id:"hourly",title:"逐小时",type:"placeholder"},{id:"forecast",title:"15日",type:"list",entity:"forecast"},{id:"city_list",title:"城市",type:"list",entity:"city"},{id:"aqi",title:"空气质量",type:"placeholder"},{id:"life_index",title:"生活指数",type:"placeholder"},{id:"profile",title:"我的",type:"placeholder"}
    ], [
      {name:"city",fields:[f("id","uuid",true),f("name","string"),f("country","string"),f("latitude","float"),f("longitude","float"),f("is_current","bool")]},
      {name:"forecast",fields:[f("id","uuid",true),f("city_id","uuid"),f("date","date"),f("temp_high","int"),f("temp_low","int"),f("condition","string"),f("humidity","int"),f("wind_speed","float"),f("aqi","int")],relations:[{target:"city",type:"belongs_to"}]},
    ],["today","forecast","city_list","profile"],["真实天气需OpenWeatherMap API"])},
  // 15. 体育 — 对标 懂球帝/ESPN
  { id: "sports", name: "体育赛事", description: "实时比分+赛程+积分榜+球队数据+新闻+关注", category: "内容", icon: "⚽",
    spec: base("sports","体育",[
      {id:"live",title:"直播",type:"placeholder"},{id:"match_list",title:"赛程",type:"list",entity:"match"},{id:"match_detail",title:"详情",type:"detail",entity:"match"},{id:"standings",title:"积分榜",type:"list",entity:"standing"},{id:"team_list",title:"球队",type:"list",entity:"team"},{id:"news_list",title:"资讯",type:"list",entity:"news"},{id:"profile",title:"我的",type:"placeholder"}
    ], [
      {name:"team",fields:[f("id","uuid",true),f("name","string"),f("logo","image"),f("league","string")]},
      {name:"match",fields:[f("id","uuid",true),f("home_team_id","uuid"),f("away_team_id","uuid"),f("home_score","int"),f("away_score","int"),f("date","datetime"),f("status","string"),f("venue","string")],relations:[{target:"team",type:"belongs_to"},{target:"team",type:"belongs_to"}]},
      {name:"standing",fields:[f("id","uuid",true),f("team_id","uuid"),f("league","string"),f("points","int"),f("played","int"),f("won","int"),f("drawn","int"),f("lost","int"),f("goals_for","int"),f("goals_against","int")],relations:[{target:"team",type:"belongs_to"}]},
      {name:"news",fields:[f("id","uuid",true),f("title","string"),f("summary","string"),f("content","string"),f("image","image"),f("source","string")]},
    ],["live","match_list","standings","profile"],["实时数据需第三方API","直播需流媒体"])},
  // 16. 照片 — 对标 Instagram/Pinterest
  { id: "photo_share", name: "照片社区", description: "发现+话题+点赞收藏+关注+私信", category: "社交", icon: "📸",
    spec: base("photo_share","照片社区",[
      {id:"discover",title:"发现",type:"list",entity:"photo"},{id:"photo_detail",title:"详情",type:"detail",entity:"photo"},{id:"upload",title:"发布",type:"form",entity:"photo"},{id:"challenge_list",title:"话题",type:"list",entity:"challenge"},{id:"profile",title:"我的",type:"placeholder"}
    ], [
      {name:"photo",fields:[f("id","uuid",true),f("user_id","uuid"),f("image_url","image"),f("caption","string"),f("filter","string"),f("location","string"),f("tags","json"),f("likes","int"),f("comments","int"),f("saves","int")]},
      {name:"challenge",fields:[f("id","uuid",true),f("name","string"),f("description","string"),f("cover","image"),f("start_date","datetime"),f("end_date","datetime")]},
    ],["discover","challenge_list","upload","profile"],["图片上传需Storage","滤镜需额外开发"])},
  // 17. 交友 — 对标 Tinder/探探/Bumble
  { id: "dating", name: "交友匹配", description: "滑动匹配+资料完善+筛选+喜欢+聊天+会员", category: "社交", icon: "💕",
    spec: base("dating","交友",[
      {id:"discover",title:"发现",type:"placeholder"},{id:"profile_detail",title:"资料",type:"detail",entity:"user_profile"},{id:"edit_profile",title:"编辑资料",type:"form",entity:"user_profile"},{id:"matches",title:"匹配",type:"list",entity:"match"},{id:"chat",title:"聊天",type:"chat"},{id:"my_profile",title:"我的",type:"placeholder"}
    ], [
      {name:"user_profile",fields:[f("id","uuid",true),f("user_id","uuid"),f("display_name","string"),f("bio","string"),f("photos","json"),f("age","int"),f("gender","string"),f("interests","json"),f("location","string"),f("verified","bool")]},
      {name:"match",fields:[f("id","uuid",true),f("user_id","uuid"),f("matched_user_id","uuid"),f("status","string"),f("matched_at","datetime")]},
    ],["discover","matches","chat","my_profile"],["滑动动画需自定义","匹配算法需定制","KYC需第三方"])},
];

export function getTemplateById(id: string): SpecTemplate | undefined {
  return TEMPLATE_LIBRARY.find((t) => t.id === id);
}
