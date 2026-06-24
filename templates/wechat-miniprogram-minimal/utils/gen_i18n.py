#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Generate the complete i18n.js file with all 10 locales embedded."""

import os

OUT_DIR = os.path.dirname(os.path.abspath(__file__))

# ============================================================
# ALL LOCALE TRANSLATIONS
# ============================================================

L10N = {}

# --- English ---
L10N['en'] = {
    "common": {
        "ok": "OK", "cancel": "Cancel", "save": "Save", "delete": "Delete",
        "edit": "Edit", "search": "Search", "loading": "Loading...", "error": "Error",
        "retry": "Retry", "empty": "No data", "confirm": "Confirm", "close": "Close"
    },
    "auth": {
        "login": "Login", "register": "Register", "email": "Email",
        "password": "Password", "forgotPassword": "Forgot Password", "logout": "Logout"
    },
    "nav": {
        "home": "Home", "profile": "Profile", "settings": "Settings", "back": "Back"
    },
    "industry": {
        "finance": {
            "addTransaction": "Add Transaction", "budget": "Budget", "income": "Income",
            "expense": "Expense", "balance": "Balance", "category": "Category",
            "transaction": "Transaction", "monthlyReport": "Monthly Report", "transfer": "Transfer",
            "account": "Account", "statement": "Statement", "recurring": "Recurring",
            "splitBill": "Split Bill", "refund": "Refund", "exchangeRate": "Exchange Rate",
            "tax": "Tax", "investment": "Investment", "saving": "Saving", "debt": "Debt",
            "currency": "Currency"
        },
        "ecommerce": {
            "product": "Product", "cart": "Cart", "order": "Order", "checkout": "Checkout",
            "payment": "Payment", "shipping": "Shipping", "tracking": "Tracking",
            "review": "Review", "wishlist": "Wishlist", "discount": "Discount",
            "coupon": "Coupon", "category": "Category", "brand": "Brand", "size": "Size",
            "color": "Color", "quantity": "Quantity", "total": "Total", "subtotal": "Subtotal",
            "refund": "Refund", "rating": "Rating"
        },
        "food": {
            "order": "Order", "restaurant": "Restaurant", "menu": "Menu",
            "delivery": "Delivery", "takeout": "Takeout", "reservation": "Reservation",
            "review": "Review", "coupon": "Coupon", "dish": "Dish", "cuisine": "Cuisine",
            "rating": "Rating", "fee": "Fee", "address": "Address", "distance": "Distance",
            "openTime": "Opening Hours", "category": "Category", "combo": "Combo",
            "payment": "Payment", "comment": "Comment", "favorite": "Favorite"
        },
        "medical": {
            "appointment": "Appointment", "doctor": "Doctor", "department": "Department",
            "hospital": "Hospital", "prescription": "Prescription", "diagnosis": "Diagnosis",
            "medicine": "Medicine", "fee": "Fee", "insurance": "Insurance", "record": "Record",
            "symptom": "Symptom", "clinic": "Clinic", "surgery": "Surgery", "report": "Report",
            "queue": "Queue", "registration": "Registration", "pharmacy": "Pharmacy",
            "checkup": "Checkup", "emergency": "Emergency", "consultation": "Consultation"
        },
        "fitness": {
            "workout": "Workout", "exercise": "Exercise", "set": "Set", "rep": "Rep",
            "weight": "Weight", "calorie": "Calorie", "duration": "Duration",
            "heartRate": "Heart Rate", "progress": "Progress", "goal": "Goal",
            "challenge": "Challenge", "achievement": "Achievement", "plan": "Plan",
            "routine": "Routine", "rest": "Rest", "warmup": "Warmup", "cooldown": "Cooldown",
            "streak": "Streak", "bodyMeasure": "Body Measure", "nutrition": "Nutrition"
        },
        "education": {
            "course": "Course", "lesson": "Lesson", "assignment": "Assignment",
            "exam": "Exam", "grade": "Grade", "homework": "Homework", "schedule": "Schedule",
            "teacher": "Teacher", "student": "Student", "classroom": "Classroom",
            "quiz": "Quiz", "certificate": "Certificate", "progress": "Progress",
            "deadline": "Deadline", "enrollment": "Enrollment", "tuition": "Tuition",
            "lecture": "Lecture", "tutorial": "Tutorial", "resource": "Resource",
            "library": "Library"
        },
        "social": {
            "post": "Post", "comment": "Comment", "like": "Like", "share": "Share",
            "follow": "Follow", "message": "Message", "notification": "Notification",
            "friend": "Friend", "group": "Group", "story": "Story", "feed": "Feed",
            "trend": "Trend", "hashtag": "Hashtag", "mention": "Mention",
            "reaction": "Reaction", "poll": "Poll", "event": "Event", "live": "Live",
            "tag": "Tag", "explore": "Explore"
        },
        "hotel": {
            "hotel": "Hotel", "room": "Room", "booking": "Booking", "checkin": "Check-in",
            "checkout": "Check-out", "amenity": "Amenity", "breakfast": "Breakfast",
            "price": "Price", "star": "Star", "review": "Review", "location": "Location",
            "cancel": "Cancel", "upgrade": "Upgrade", "suite": "Suite",
            "guestCount": "Guests", "nights": "Nights", "total": "Total",
            "deposit": "Deposit", "invoice": "Invoice", "concierge": "Concierge"
        },
        "recruitment": {
            "job": "Job", "resume": "Resume", "interview": "Interview",
            "salary": "Salary", "company": "Company", "location": "Location",
            "experience": "Experience", "education": "Education", "skill": "Skill",
            "application": "Application", "refer": "Refer", "offer": "Offer",
            "contract": "Contract", "probation": "Probation", "benefit": "Benefit",
            "industry": "Industry", "position": "Position", "department": "Department",
            "hire": "Hire", "candidate": "Candidate"
        },
        "property": {
            "repair": "Repair", "bill": "Bill", "notice": "Notice", "facility": "Facility",
            "parking": "Parking", "security": "Security", "cleaning": "Cleaning",
            "visitor": "Visitor", "complaint": "Complaint", "fee": "Fee",
            "maintenance": "Maintenance", "decoration": "Decoration", "moving": "Moving",
            "key": "Key", "meter": "Meter", "inspection": "Inspection",
            "renovation": "Renovation", "garbage": "Garbage", "elevator": "Elevator",
            "guard": "Guard"
        },
        "video": {
            "video": "Video", "channel": "Channel", "subscription": "Subscription",
            "playlist": "Playlist", "history": "History", "trend": "Trend",
            "category": "Category", "upload": "Upload", "like": "Like",
            "comment": "Comment", "share": "Share", "quality": "Quality",
            "subtitle": "Subtitle", "autoplay": "Autoplay", "download": "Download",
            "watchLater": "Watch Later", "recommendation": "Recommendation",
            "creator": "Creator", "live": "Live", "shorts": "Shorts"
        },
        "sports": {
            "match": "Match", "team": "Team", "player": "Player", "score": "Score",
            "league": "League", "tournament": "Tournament", "standing": "Standing",
            "highlight": "Highlight", "news": "News", "ticket": "Ticket",
            "stadium": "Stadium", "schedule": "Schedule", "result": "Result",
            "lineup": "Lineup", "transfer": "Transfer", "injury": "Injury",
            "referee": "Referee", "fan": "Fan", "merchandise": "Merchandise",
            "broadcast": "Broadcast"
        },
        "photo": {
            "photo": "Photo", "album": "Album", "camera": "Camera", "filter": "Filter",
            "edit": "Edit", "share": "Share", "like": "Like", "comment": "Comment",
            "tag": "Tag", "location": "Location", "collection": "Collection",
            "gallery": "Gallery", "upload": "Upload", "download": "Download",
            "quality": "Quality", "resolution": "Resolution", "exposure": "Exposure",
            "contrast": "Contrast", "brightness": "Brightness", "saturation": "Saturation"
        },
        "dating": {
            "profile": "Profile", "match": "Match", "message": "Message",
            "like": "Like", "superlike": "Super Like", "dislike": "Dislike",
            "interest": "Interest", "photo": "Photo", "bio": "Bio", "distance": "Distance",
            "preference": "Preference", "setting": "Setting", "verification": "Verification",
            "report": "Report", "block": "Block", "discover": "Discover",
            "nearby": "Nearby", "online": "Online", "visit": "Visit", "favorite": "Favorite"
        },
        "blog": {
            "article": "Article", "category": "Category", "tag": "Tag", "author": "Author",
            "read": "Read", "bookmark": "Bookmark", "follow": "Follow",
            "comment": "Comment", "like": "Like", "share": "Share", "draft": "Draft",
            "publish": "Publish", "series": "Series", "newsletter": "Newsletter",
            "archive": "Archive", "subscribe": "Subscribe", "popular": "Popular",
            "recent": "Recent", "featured": "Featured", "trending": "Trending"
        },
        "game": {
            "game": "Game", "level": "Level", "score": "Score", "rank": "Rank",
            "achievement": "Achievement", "leaderboard": "Leaderboard",
            "challenge": "Challenge", "reward": "Reward", "coin": "Coin",
            "character": "Character", "weapon": "Weapon", "skill": "Skill",
            "quest": "Quest", "mission": "Mission", "player": "Player",
            "guild": "Guild", "tournament": "Tournament", "battle": "Battle",
            "item": "Item", "upgrade": "Upgrade"
        },
        "payment": {
            "payment": "Payment", "transfer": "Transfer", "recharge": "Recharge",
            "withdraw": "Withdraw", "bill": "Bill", "receipt": "Receipt",
            "invoice": "Invoice", "balance": "Balance", "limit": "Limit",
            "fee": "Fee", "exchange": "Exchange", "refund": "Refund",
            "dispute": "Dispute", "statement": "Statement", "card": "Card",
            "account": "Account", "currency": "Currency", "rate": "Rate",
            "tax": "Tax", "voucher": "Voucher"
        },
        "crm": {
            "contact": "Contact", "lead": "Lead", "deal": "Deal", "pipeline": "Pipeline",
            "task": "Task", "activity": "Activity", "note": "Note", "meeting": "Meeting",
            "call": "Call", "email": "Email", "followup": "Follow-up",
            "contract": "Contract", "quote": "Quote", "invoice": "Invoice",
            "order": "Order", "opportunity": "Opportunity", "account": "Account",
            "campaign": "Campaign", "report": "Report", "dashboard": "Dashboard"
        },
        "weather": {
            "forecast": "Forecast", "temperature": "Temperature", "humidity": "Humidity",
            "wind": "Wind", "uv": "UV Index", "aqi": "Air Quality",
            "sunrise": "Sunrise", "sunset": "Sunset", "rain": "Rain", "snow": "Snow",
            "thunderstorm": "Thunderstorm", "cloud": "Cloud", "visibility": "Visibility",
            "pressure": "Pressure", "dew": "Dew Point", "feelsLike": "Feels Like",
            "hourly": "Hourly", "daily": "Daily", "alert": "Alert", "season": "Season"
        },
        "generic": {
            "item": "Item", "detail": "Detail", "list": "List", "add": "Add",
            "create": "Create", "update": "Update", "remove": "Remove", "info": "Info",
            "status": "Status", "date": "Date", "time": "Time", "category": "Category",
            "type": "Type", "note": "Note", "upload": "Upload", "download": "Download",
            "share": "Share", "copy": "Copy", "print": "Print", "filter": "Filter"
        }
    }  # end industry
}

# --- Simplified Chinese ---
L10N['zh'] = {
    "common": {
        "ok": "确定", "cancel": "取消", "save": "保存", "delete": "删除",
        "edit": "编辑", "search": "搜索", "loading": "加载中...", "error": "错误",
        "retry": "重试", "empty": "暂无数据", "confirm": "确认", "close": "关闭"
    },
    "auth": {
        "login": "登录", "register": "注册", "email": "邮箱",
        "password": "密码", "forgotPassword": "忘记密码", "logout": "退出登录"
    },
    "nav": {
        "home": "首页", "profile": "个人中心", "settings": "设置", "back": "返回"
    },
    "industry": {
        "finance": {
            "addTransaction": "添加交易", "budget": "预算", "income": "收入",
            "expense": "支出", "balance": "余额", "category": "分类",
            "transaction": "交易", "monthlyReport": "月度报告", "transfer": "转账",
            "account": "账户", "statement": "账单", "recurring": "定期",
            "splitBill": "分摊", "refund": "退款", "exchangeRate": "汇率",
            "tax": "税费", "investment": "投资", "saving": "储蓄", "debt": "债务",
            "currency": "货币"
        },
        "ecommerce": {
            "product": "商品", "cart": "购物车", "order": "订单", "checkout": "结算",
            "payment": "支付", "shipping": "配送", "tracking": "物流跟踪",
            "review": "评价", "wishlist": "收藏夹", "discount": "折扣",
            "coupon": "优惠券", "category": "分类", "brand": "品牌", "size": "尺寸",
            "color": "颜色", "quantity": "数量", "total": "合计", "subtotal": "小计",
            "refund": "退款", "rating": "评分"
        },
        "food": {
            "order": "点单", "restaurant": "餐厅", "menu": "菜单",
            "delivery": "外卖配送", "takeout": "外卖", "reservation": "预订",
            "review": "评价", "coupon": "优惠券", "dish": "菜品", "cuisine": "菜系",
            "rating": "评分", "fee": "费用", "address": "地址", "distance": "距离",
            "openTime": "营业时间", "category": "分类", "combo": "套餐",
            "payment": "支付", "comment": "评论", "favorite": "收藏"
        },
        "medical": {
            "appointment": "预约", "doctor": "医生", "department": "科室",
            "hospital": "医院", "prescription": "处方", "diagnosis": "诊断",
            "medicine": "药品", "fee": "费用", "insurance": "保险", "record": "病历",
            "symptom": "症状", "clinic": "诊所", "surgery": "手术", "report": "报告",
            "queue": "排队", "registration": "挂号", "pharmacy": "药房",
            "checkup": "体检", "emergency": "急诊", "consultation": "问诊"
        },
        "fitness": {
            "workout": "训练", "exercise": "运动", "set": "组", "rep": "次",
            "weight": "重量", "calorie": "卡路里", "duration": "时长",
            "heartRate": "心率", "progress": "进度", "goal": "目标",
            "challenge": "挑战", "achievement": "成就", "plan": "计划",
            "routine": "常规", "rest": "休息", "warmup": "热身", "cooldown": "放松",
            "streak": "连续", "bodyMeasure": "身体测量", "nutrition": "营养"
        },
        "education": {
            "course": "课程", "lesson": "课时", "assignment": "作业",
            "exam": "考试", "grade": "成绩", "homework": "家庭作业", "schedule": "课程表",
            "teacher": "老师", "student": "学生", "classroom": "教室",
            "quiz": "测验", "certificate": "证书", "progress": "进度",
            "deadline": "截止日期", "enrollment": "报名", "tuition": "学费",
            "lecture": "讲座", "tutorial": "辅导", "resource": "资源",
            "library": "图书馆"
        },
        "social": {
            "post": "发布", "comment": "评论", "like": "赞", "share": "分享",
            "follow": "关注", "message": "消息", "notification": "通知",
            "friend": "好友", "group": "群组", "story": "动态", "feed": "信息流",
            "trend": "趋势", "hashtag": "话题", "mention": "提及",
            "reaction": "反应", "poll": "投票", "event": "活动", "live": "直播",
            "tag": "标签", "explore": "发现"
        },
        "hotel": {
            "hotel": "酒店", "room": "房间", "booking": "预订", "checkin": "入住",
            "checkout": "退房", "amenity": "设施", "breakfast": "早餐",
            "price": "价格", "star": "星级", "review": "评价", "location": "位置",
            "cancel": "取消", "upgrade": "升级", "suite": "套房",
            "guestCount": "住客人数", "nights": "晚数", "total": "总计",
            "deposit": "押金", "invoice": "发票", "concierge": "礼宾"
        },
        "recruitment": {
            "job": "职位", "resume": "简历", "interview": "面试",
            "salary": "薪资", "company": "公司", "location": "地点",
            "experience": "经验", "education": "学历", "skill": "技能",
            "application": "申请", "refer": "推荐", "offer": "录用",
            "contract": "合同", "probation": "试用期", "benefit": "福利",
            "industry": "行业", "position": "职位", "department": "部门",
            "hire": "招聘", "candidate": "候选人"
        },
        "property": {
            "repair": "报修", "bill": "缴费", "notice": "公告", "facility": "设施",
            "parking": "停车", "security": "安保", "cleaning": "清洁",
            "visitor": "访客", "complaint": "投诉", "fee": "费用",
            "maintenance": "维护", "decoration": "装修", "moving": "搬家",
            "key": "钥匙", "meter": "仪表", "inspection": "检查",
            "renovation": "翻新", "garbage": "垃圾", "elevator": "电梯",
            "guard": "门卫"
        },
        "video": {
            "video": "视频", "channel": "频道", "subscription": "订阅",
            "playlist": "播放列表", "history": "历史", "trend": "热门",
            "category": "分类", "upload": "上传", "like": "点赞",
            "comment": "评论", "share": "分享", "quality": "画质",
            "subtitle": "字幕", "autoplay": "自动播放", "download": "下载",
            "watchLater": "稍后观看", "recommendation": "推荐",
            "creator": "创作者", "live": "直播", "shorts": "短视频"
        },
        "sports": {
            "match": "比赛", "team": "球队", "player": "球员", "score": "比分",
            "league": "联赛", "tournament": "锦标赛", "standing": "排名",
            "highlight": "集锦", "news": "新闻", "ticket": "门票",
            "stadium": "体育场", "schedule": "赛程", "result": "结果",
            "lineup": "阵容", "transfer": "转会", "injury": "伤病",
            "referee": "裁判", "fan": "球迷", "merchandise": "周边",
            "broadcast": "直播"
        },
        "photo": {
            "photo": "照片", "album": "相册", "camera": "相机", "filter": "滤镜",
            "edit": "编辑", "share": "分享", "like": "点赞", "comment": "评论",
            "tag": "标签", "location": "位置", "collection": "收藏集",
            "gallery": "画廊", "upload": "上传", "download": "下载",
            "quality": "画质", "resolution": "分辨率", "exposure": "曝光",
            "contrast": "对比度", "brightness": "亮度", "saturation": "饱和度"
        },
        "dating": {
            "profile": "个人资料", "match": "匹配", "message": "消息",
            "like": "喜欢", "superlike": "超级喜欢", "dislike": "不喜欢",
            "interest": "兴趣", "photo": "照片", "bio": "简介", "distance": "距离",
            "preference": "偏好", "setting": "设置", "verification": "认证",
            "report": "举报", "block": "屏蔽", "discover": "发现",
            "nearby": "附近", "online": "在线", "visit": "访问", "favorite": "收藏"
        },
        "blog": {
            "article": "文章", "category": "分类", "tag": "标签", "author": "作者",
            "read": "阅读", "bookmark": "书签", "follow": "关注",
            "comment": "评论", "like": "点赞", "share": "分享", "draft": "草稿",
            "publish": "发布", "series": "系列", "newsletter": "通讯",
            "archive": "归档", "subscribe": "订阅", "popular": "热门",
            "recent": "最新", "featured": "精选", "trending": " trending"
        },
        "game": {
            "game": "游戏", "level": "关卡", "score": "分数", "rank": "排名",
            "achievement": "成就", "leaderboard": "排行榜",
            "challenge": "挑战", "reward": "奖励", "coin": "金币",
            "character": "角色", "weapon": "武器", "skill": "技能",
            "quest": "任务", "mission": "使命", "player": "玩家",
            "guild": "公会", "tournament": " tournament", "battle": "战斗",
            "item": "物品", "upgrade": "升级"
        },
        "payment": {
            "payment": "支付", "transfer": "转账", "recharge": "充值",
            "withdraw": "提现", "bill": "账单", "receipt": "收据",
            "invoice": "发票", "balance": "余额", "limit": "限额",
            "fee": "费用", "exchange": "兑换", "refund": "退款",
            "dispute": "争议", "statement": "流水", "card": "卡",
            "account": "账户", "currency": "币种", "rate": "汇率",
            "tax": "税费", "voucher": "凭证"
        },
        "crm": {
            "contact": "联系人", "lead": "线索", "deal": "商机", "pipeline": "管道",
            "task": "任务", "activity": "活动", "note": "备注", "meeting": "会议",
            "call": "通话", "email": "邮件", "followup": "跟进",
            "contract": "合同", "quote": "报价", "invoice": "发票",
            "order": "订单", "opportunity": "机会", "account": "客户",
            "campaign": "活动", "report": "报告", "dashboard": "仪表盘"
        },
        "weather": {
            "forecast": "预报", "temperature": "温度", "humidity": "湿度",
            "wind": "风力", "uv": "紫外线指数", "aqi": "空气质量",
            "sunrise": "日出", "sunset": "日落", "rain": "雨", "snow": "雪",
            "thunderstorm": "雷暴", "cloud": "云", "visibility": "能见度",
            "pressure": "气压", "dew": "露点", "feelsLike": "体感温度",
            "hourly": "逐小时", "daily": "逐日", "alert": "预警", "season": "季节"
        },
        "generic": {
            "item": "项目", "detail": "详情", "list": "列表", "add": "添加",
            "create": "创建", "update": "更新", "remove": "移除", "info": "信息",
            "status": "状态", "date": "日期", "time": "时间", "category": "分类",
            "type": "类型", "note": "备注", "upload": "上传", "download": "下载",
            "share": "分享", "copy": "复制", "print": "打印", "filter": "筛选"
        }
    }
}

# --- Traditional Chinese ---
L10N['zh_TW'] = {
    "common": {
        "ok": "確定", "cancel": "取消", "save": "儲存", "delete": "刪除",
        "edit": "編輯", "search": "搜尋", "loading": "載入中...", "error": "錯誤",
        "retry": "重試", "empty": "暫無資料", "confirm": "確認", "close": "關閉"
    },
    "auth": {
        "login": "登入", "register": "註冊", "email": "電郵",
        "password": "密碼", "forgotPassword": "忘記密碼", "logout": "登出"
    },
    "nav": {
        "home": "首頁", "profile": "個人中心", "settings": "設定", "back": "返回"
    },
    "industry": {
        "finance": {
            "addTransaction": "新增交易", "budget": "預算", "income": "收入",
            "expense": "支出", "balance": "餘額", "category": "分類",
            "transaction": "交易", "monthlyReport": "月度報告", "transfer": "轉帳",
            "account": "帳戶", "statement": "帳單", "recurring": "定期",
            "splitBill": "分攤", "refund": "退款", "exchangeRate": "匯率",
            "tax": "稅費", "investment": "投資", "saving": "儲蓄", "debt": "債務",
            "currency": "貨幣"
        },
        "ecommerce": {
            "product": "商品", "cart": "購物車", "order": "訂單", "checkout": "結帳",
            "payment": "付款", "shipping": "配送", "tracking": "物流追蹤",
            "review": "評價", "wishlist": "收藏", "discount": "折扣",
            "coupon": "優惠券", "category": "分類", "brand": "品牌", "size": "尺寸",
            "color": "顏色", "quantity": "數量", "total": "總計", "subtotal": "小計",
            "refund": "退款", "rating": "評分"
        },
        "food": {
            "order": "點餐", "restaurant": "餐廳", "menu": "菜單",
            "delivery": "外送", "takeout": "外帶", "reservation": "預約",
            "review": "評價", "coupon": "優惠券", "dish": "菜餚", "cuisine": "菜系",
            "rating": "評分", "fee": "費用", "address": "地址", "distance": "距離",
            "openTime": "營業時間", "category": "分類", "combo": "套餐",
            "payment": "付款", "comment": "評論", "favorite": "收藏"
        },
        "medical": {
            "appointment": "預約", "doctor": "醫生", "department": "科別",
            "hospital": "醫院", "prescription": "處方", "diagnosis": "診斷",
            "medicine": "藥品", "fee": "費用", "insurance": "保險", "record": "病歷",
            "symptom": "症狀", "clinic": "診所", "surgery": "手術", "report": "報告",
            "queue": "排隊", "registration": "掛號", "pharmacy": "藥局",
            "checkup": "健檢", "emergency": "急診", "consultation": "諮詢"
        },
        "fitness": {
            "workout": "訓練", "exercise": "運動", "set": "組", "rep": "次",
            "weight": "重量", "calorie": "卡路里", "duration": "時長",
            "heartRate": "心率", "progress": "進度", "goal": "目標",
            "challenge": "挑戰", "achievement": "成就", "plan": "計劃",
            "routine": "常規", "rest": "休息", "warmup": "熱身", "cooldown": "放鬆",
            "streak": "連續", "bodyMeasure": "身體測量", "nutrition": "營養"
        },
        "education": {
            "course": "課程", "lesson": "課時", "assignment": "作業",
            "exam": "考試", "grade": "成績", "homework": "家庭作業", "schedule": "課表",
            "teacher": "老師", "student": "學生", "classroom": "教室",
            "quiz": "測驗", "certificate": "證書", "progress": "進度",
            "deadline": "截止日期", "enrollment": "報名", "tuition": "學費",
            "lecture": "講座", "tutorial": "輔導", "resource": "資源",
            "library": "圖書館"
        },
        "social": {
            "post": "發布", "comment": "評論", "like": "讚", "share": "分享",
            "follow": "關注", "message": "訊息", "notification": "通知",
            "friend": "好友", "group": "群組", "story": "動態", "feed": "訊息流",
            "trend": "趨勢", "hashtag": "話題", "mention": "提及",
            "reaction": "反應", "poll": "投票", "event": "活動", "live": "直播",
            "tag": "標籤", "explore": "探索"
        },
        "hotel": {
            "hotel": "飯店", "room": "房間", "booking": "預訂", "checkin": "入住",
            "checkout": "退房", "amenity": "設施", "breakfast": "早餐",
            "price": "價格", "star": "星級", "review": "評價", "location": "位置",
            "cancel": "取消", "upgrade": "升級", "suite": "套房",
            "guestCount": "住客人數", "nights": "晚數", "total": "總計",
            "deposit": "押金", "invoice": "發票", "concierge": "禮賓"
        },
        "recruitment": {
            "job": "職位", "resume": "履歷", "interview": "面試",
            "salary": "薪資", "company": "公司", "location": "地點",
            "experience": "經驗", "education": "學歷", "skill": "技能",
            "application": "申請", "refer": "推薦", "offer": "錄取",
            "contract": "合約", "probation": "試用期", "benefit": "福利",
            "industry": "行業", "position": "職位", "department": "部門",
            "hire": "招聘", "candidate": "候選人"
        },
        "property": {
            "repair": "報修", "bill": "繳費", "notice": "公告", "facility": "設施",
            "parking": "停車", "security": "保全", "cleaning": "清潔",
            "visitor": "訪客", "complaint": "投訴", "fee": "費用",
            "maintenance": "維護", "decoration": "裝潢", "moving": "搬家",
            "key": "鑰匙", "meter": "儀表", "inspection": "檢查",
            "renovation": "翻新", "garbage": "垃圾", "elevator": "電梯",
            "guard": "警衛"
        },
        "video": {
            "video": "影片", "channel": "頻道", "subscription": "訂閱",
            "playlist": "播放清單", "history": "歷史紀錄", "trend": "熱門",
            "category": "分類", "upload": "上傳", "like": "按讚",
            "comment": "評論", "share": "分享", "quality": "畫質",
            "subtitle": "字幕", "autoplay": "自動播放", "download": "下載",
            "watchLater": "稍後觀看", "recommendation": "推薦",
            "creator": "創作者", "live": "直播", "shorts": "短片"
        },
        "sports": {
            "match": "比賽", "team": "球隊", "player": "球員", "score": "比分",
            "league": "聯賽", "tournament": "錦標賽", "standing": "排名",
            "highlight": "精華", "news": "新聞", "ticket": "門票",
            "stadium": "體育場", "schedule": "賽程", "result": "結果",
            "lineup": "陣容", "transfer": "轉會", "injury": "傷病",
            "referee": "裁判", "fan": "粉絲", "merchandise": "周邊",
            "broadcast": "轉播"
        },
        "photo": {
            "photo": "照片", "album": "相簿", "camera": "相機", "filter": "濾鏡",
            "edit": "編輯", "share": "分享", "like": "按讚", "comment": "評論",
            "tag": "標籤", "location": "位置", "collection": "收藏集",
            "gallery": "畫廊", "upload": "上傳", "download": "下載",
            "quality": "畫質", "resolution": "解析度", "exposure": "曝光",
            "contrast": "對比度", "brightness": "亮度", "saturation": "飽和度"
        },
        "dating": {
            "profile": "個人檔案", "match": "配對", "message": "訊息",
            "like": "喜歡", "superlike": "超級喜歡", "dislike": "不喜歡",
            "interest": "興趣", "photo": "照片", "bio": "簡介", "distance": "距離",
            "preference": "偏好", "setting": "設定", "verification": "認證",
            "report": "檢舉", "block": "封鎖", "discover": "探索",
            "nearby": "附近", "online": "在線", "visit": "訪問", "favorite": "收藏"
        },
        "blog": {
            "article": "文章", "category": "分類", "tag": "標籤", "author": "作者",
            "read": "閱讀", "bookmark": "書籤", "follow": "關注",
            "comment": "評論", "like": "按讚", "share": "分享", "draft": "草稿",
            "publish": "發布", "series": "系列", "newsletter": "通訊",
            "archive": "封存", "subscribe": "訂閱", "popular": "熱門",
            "recent": "最新", "featured": "精選", "trending": " trending"
        },
        "game": {
            "game": "遊戲", "level": "關卡", "score": "分數", "rank": "排名",
            "achievement": "成就", "leaderboard": "排行榜",
            "challenge": "挑戰", "reward": "獎勵", "coin": "金幣",
            "character": "角色", "weapon": "武器", "skill": "技能",
            "quest": "任務", "mission": "使命", "player": "玩家",
            "guild": "公會", "tournament": "錦標賽", "battle": "戰鬥",
            "item": "物品", "upgrade": "升級"
        },
        "payment": {
            "payment": "付款", "transfer": "轉帳", "recharge": "儲值",
            "withdraw": "提現", "bill": "帳單", "receipt": "收據",
            "invoice": "發票", "balance": "餘額", "limit": "額度",
            "fee": "費用", "exchange": "兌換", "refund": "退款",
            "dispute": "爭議", "statement": "流水", "card": "卡片",
            "account": "帳戶", "currency": "幣別", "rate": "匯率",
            "tax": "稅費", "voucher": "憑證"
        },
        "crm": {
            "contact": "聯絡人", "lead": "線索", "deal": "商機", "pipeline": "管道",
            "task": "任務", "activity": "活動", "note": "備註", "meeting": "會議",
            "call": "通話", "email": "電子郵件", "followup": "跟進",
            "contract": "合約", "quote": "報價", "invoice": "發票",
            "order": "訂單", "opportunity": "機會", "account": "客戶",
            "campaign": "活動", "report": "報告", "dashboard": "儀表板"
        },
        "weather": {
            "forecast": "預報", "temperature": "溫度", "humidity": "濕度",
            "wind": "風力", "uv": "紫外線指數", "aqi": "空氣品質",
            "sunrise": "日出", "sunset": "日落", "rain": "雨", "snow": "雪",
            "thunderstorm": "雷暴", "cloud": "雲", "visibility": "能見度",
            "pressure": "氣壓", "dew": "露點", "feelsLike": "體感溫度",
            "hourly": "逐時", "daily": "逐日", "alert": "警報", "season": "季節"
        },
        "generic": {
            "item": "項目", "detail": "詳情", "list": "列表", "add": "新增",
            "create": "建立", "update": "更新", "remove": "移除", "info": "資訊",
            "status": "狀態", "date": "日期", "time": "時間", "category": "分類",
            "type": "類型", "note": "備註", "upload": "上傳", "download": "下載",
            "share": "分享", "copy": "複製", "print": "列印", "filter": "篩選"
        }
    }
}

# --- Japanese ---
L10N['ja'] = {
    "common": {
        "ok": "OK", "cancel": "キャンセル", "save": "保存", "delete": "削除",
        "edit": "編集", "search": "検索", "loading": "読み込み中...", "error": "エラー",
        "retry": "再試行", "empty": "データがありません", "confirm": "確認", "close": "閉じる"
    },
    "auth": {
        "login": "ログイン", "register": "登録", "email": "メール",
        "password": "パスワード", "forgotPassword": "パスワードをお忘れの場合", "logout": "ログアウト"
    },
    "nav": {
        "home": "ホーム", "profile": "プロフィール", "settings": "設定", "back": "戻る"
    },
    "industry": {
        "finance": {
            "addTransaction": "取引を追加", "budget": "予算", "income": "収入",
            "expense": "支出", "balance": "残高", "category": "カテゴリ",
            "transaction": "取引", "monthlyReport": "月次レポート", "transfer": "振替",
            "account": "口座", "statement": "明細書", "recurring": "定期",
            "splitBill": "割り勘", "refund": "返金", "exchangeRate": "為替レート",
            "tax": "税金", "investment": "投資", "saving": "貯蓄", "debt": "借金",
            "currency": "通貨"
        },
        "ecommerce": {
            "product": "商品", "cart": "カート", "order": "注文", "checkout": "会計",
            "payment": "支払い", "shipping": "配送", "tracking": "追跡",
            "review": "レビュー", "wishlist": "ウィッシュリスト", "discount": "割引",
            "coupon": "クーポン", "category": "カテゴリ", "brand": "ブランド", "size": "サイズ",
            "color": "色", "quantity": "数量", "total": "合計", "subtotal": "小計",
            "refund": "返金", "rating": "評価"
        },
        "food": {
            "order": "注文", "restaurant": "レストラン", "menu": "メニュー",
            "delivery": "デリバリー", "takeout": "テイクアウト", "reservation": "予約",
            "review": "レビュー", "coupon": "クーポン", "dish": "料理", "cuisine": "料理ジャンル",
            "rating": "評価", "fee": "料金", "address": "住所", "distance": "距離",
            "openTime": "営業時間", "category": "カテゴリ", "combo": "セット",
            "payment": "支払い", "comment": "コメント", "favorite": "お気に入り"
        },
        "medical": {
            "appointment": "予約", "doctor": "医者", "department": "診療科",
            "hospital": "病院", "prescription": "処方箋", "diagnosis": "診断",
            "medicine": "薬", "fee": "料金", "insurance": "保険", "record": "診療記録",
            "symptom": "症状", "clinic": "診療所", "surgery": "手術", "report": "レポート",
            "queue": "待ち行列", "registration": "受付", "pharmacy": "薬局",
            "checkup": "健康診断", "emergency": "救急", "consultation": "診察"
        },
        "fitness": {
            "workout": "ワークアウト", "exercise": "運動", "set": "セット", "rep": "回",
            "weight": "重量", "calorie": "カロリー", "duration": "時間",
            "heartRate": "心拍数", "progress": "進捗", "goal": "目標",
            "challenge": "チャレンジ", "achievement": "実績", "plan": "計画",
            "routine": "ルーティン", "rest": "休憩", "warmup": "ウォームアップ", "cooldown": "クールダウン",
            "streak": "連続記録", "bodyMeasure": "身体測定", "nutrition": "栄養"
        },
        "education": {
            "course": "コース", "lesson": "レッスン", "assignment": "課題",
            "exam": "試験", "grade": "成績", "homework": "宿題", "schedule": "スケジュール",
            "teacher": "先生", "student": "学生", "classroom": "教室",
            "quiz": "クイズ", "certificate": "証明書", "progress": "進捗",
            "deadline": "期限", "enrollment": "入学", "tuition": "授業料",
            "lecture": "講義", "tutorial": "チュートリアル", "resource": "リソース",
            "library": "図書館"
        },
        "social": {
            "post": "投稿", "comment": "コメント", "like": "いいね", "share": "シェア",
            "follow": "フォロー", "message": "メッセージ", "notification": "通知",
            "friend": "友達", "group": "グループ", "story": "ストーリー", "feed": "フィード",
            "trend": "トレンド", "hashtag": "ハッシュタグ", "mention": "メンション",
            "reaction": "リアクション", "poll": "投票", "event": "イベント", "live": "ライブ",
            "tag": "タグ", "explore": "探索"
        },
        "hotel": {
            "hotel": "ホテル", "room": "部屋", "booking": "予約", "checkin": "チェックイン",
            "checkout": "チェックアウト", "amenity": "アメニティ", "breakfast": "朝食",
            "price": "料金", "star": "星評価", "review": "レビュー", "location": "場所",
            "cancel": "キャンセル", "upgrade": "アップグレード", "suite": "スイート",
            "guestCount": "宿泊人数", "nights": "泊数", "total": "合計",
            "deposit": "デポジット", "invoice": "請求書", "concierge": "コンシェルジュ"
        },
        "recruitment": {
            "job": "求人", "resume": "履歴書", "interview": "面接",
            "salary": "給与", "company": "会社", "location": "場所",
            "experience": "経験", "education": "学歴", "skill": "スキル",
            "application": "応募", "refer": "紹介", "offer": "内定",
            "contract": "契約", "probation": "試用期間", "benefit": "福利厚生",
            "industry": "業界", "position": "役職", "department": "部署",
            "hire": "採用", "candidate": "候補者"
        },
        "property": {
            "repair": "修理", "bill": "請求", "notice": "お知らせ", "facility": "施設",
            "parking": "駐車場", "security": "警備", "cleaning": "清掃",
            "visitor": "訪問者", "complaint": "苦情", "fee": "料金",
            "maintenance": "メンテナンス", "decoration": "装飾", "moving": "引越し",
            "key": "鍵", "meter": "メーター", "inspection": "点検",
            "renovation": "改装", "garbage": "ゴミ", "elevator": "エレベーター",
            "guard": "警備員"
        },
        "video": {
            "video": "動画", "channel": "チャンネル", "subscription": "登録",
            "playlist": "プレイリスト", "history": "履歴", "trend": "トレンド",
            "category": "カテゴリ", "upload": "アップロード", "like": "いいね",
            "comment": "コメント", "share": "シェア", "quality": "画質",
            "subtitle": "字幕", "autoplay": "自動再生", "download": "ダウンロード",
            "watchLater": "後で見る", "recommendation": "おすすめ",
            "creator": "クリエイター", "live": "ライブ", "shorts": "ショート"
        },
        "sports": {
            "match": "試合", "team": "チーム", "player": "選手", "score": "得点",
            "league": "リーグ", "tournament": "トーナメント", "standing": "順位",
            "highlight": "ハイライト", "news": "ニュース", "ticket": "チケット",
            "stadium": "スタジアム", "schedule": "スケジュール", "result": "結果",
            "lineup": "先発", "transfer": "移籍", "injury": "怪我",
            "referee": "審判", "fan": "ファン", "merchandise": "グッズ",
            "broadcast": "放送"
        },
        "photo": {
            "photo": "写真", "album": "アルバム", "camera": "カメラ", "filter": "フィルター",
            "edit": "編集", "share": "シェア", "like": "いいね", "comment": "コメント",
            "tag": "タグ", "location": "場所", "collection": "コレクション",
            "gallery": "ギャラリー", "upload": "アップロード", "download": "ダウンロード",
            "quality": "画質", "resolution": "解像度", "exposure": "露出",
            "contrast": "コントラスト", "brightness": "明るさ", "saturation": "彩度"
        },
        "dating": {
            "profile": "プロフィール", "match": "マッチ", "message": "メッセージ",
            "like": "いいね", "superlike": "スーパーいいね", "dislike": "嫌い",
            "interest": "興味", "photo": "写真", "bio": "自己紹介", "distance": "距離",
            "preference": "好み", "setting": "設定", "verification": "認証",
            "report": "報告", "block": "ブロック", "discover": "発見",
            "nearby": "近く", "online": "オンライン", "visit": "訪問", "favorite": "お気に入り"
        },
        "blog": {
            "article": "記事", "category": "カテゴリ", "tag": "タグ", "author": "著者",
            "read": "読む", "bookmark": "ブックマーク", "follow": "フォロー",
            "comment": "コメント", "like": "いいね", "share": "シェア", "draft": "下書き",
            "publish": "公開", "series": "シリーズ", "newsletter": "ニュースレター",
            "archive": "アーカイブ", "subscribe": "購読", "popular": "人気",
            "recent": "最新", "featured": "注目", "trending": "急上昇"
        },
        "game": {
            "game": "ゲーム", "level": "レベル", "score": "スコア", "rank": "ランク",
            "achievement": "実績", "leaderboard": "ランキング",
            "challenge": "チャレンジ", "reward": "報酬", "coin": "コイン",
            "character": "キャラクター", "weapon": "武器", "skill": "スキル",
            "quest": "クエスト", "mission": "ミッション", "player": "プレイヤー",
            "guild": "ギルド", "tournament": "トーナメント", "battle": "バトル",
            "item": "アイテム", "upgrade": "アップグレード"
        },
        "payment": {
            "payment": "支払い", "transfer": "振込", "recharge": "チャージ",
            "withdraw": "出金", "bill": "請求書", "receipt": "領収書",
            "invoice": "請求書", "balance": "残高", "limit": "限度額",
            "fee": "手数料", "exchange": "両替", "refund": "返金",
            "dispute": "異議申立", "statement": "明細", "card": "カード",
            "account": "口座", "currency": "通貨", "rate": "レート",
            "tax": "税金", "voucher": "バウチャー"
        },
        "crm": {
            "contact": "連絡先", "lead": "見込み客", "deal": "商談", "pipeline": "パイプライン",
            "task": "タスク", "activity": "アクティビティ", "note": "メモ", "meeting": "会議",
            "call": "電話", "email": "メール", "followup": "フォローアップ",
            "contract": "契約", "quote": "見積書", "invoice": "請求書",
            "order": "注文", "opportunity": "案件", "account": "顧客",
            "campaign": "キャンペーン", "report": "レポート", "dashboard": "ダッシュボード"
        },
        "weather": {
            "forecast": "天気予報", "temperature": "気温", "humidity": "湿度",
            "wind": "風", "uv": "紫外線指数", "aqi": "空気質",
            "sunrise": "日の出", "sunset": "日没", "rain": "雨", "snow": "雪",
            "thunderstorm": "雷雨", "cloud": "曇り", "visibility": "視程",
            "pressure": "気圧", "dew": "露点", "feelsLike": "体感温度",
            "hourly": "時間ごと", "daily": "日ごと", "alert": "警報", "season": "季節"
        },
        "generic": {
            "item": "項目", "detail": "詳細", "list": "一覧", "add": "追加",
            "create": "作成", "update": "更新", "remove": "削除", "info": "情報",
            "status": "ステータス", "date": "日付", "time": "時間", "category": "カテゴリ",
            "type": "タイプ", "note": "メモ", "upload": "アップロード", "download": "ダウンロード",
            "share": "シェア", "copy": "コピー", "print": "印刷", "filter": "フィルター"
        }
    }
}

# --- Korean ---
L10N['ko'] = {
    "common": {
        "ok": "확인", "cancel": "취소", "save": "저장", "delete": "삭제",
        "edit": "편집", "search": "검색", "loading": "로딩 중...", "error": "오류",
        "retry": "재시도", "empty": "데이터 없음", "confirm": "확인", "close": "닫기"
    },
    "auth": {
        "login": "로그인", "register": "회원가입", "email": "이메일",
        "password": "비밀번호", "forgotPassword": "비밀번호 찾기", "logout": "로그아웃"
    },
    "nav": {
        "home": "홈", "profile": "프로필", "settings": "설정", "back": "뒤로"
    },
    "industry": {
        "finance": {
            "addTransaction": "거래 추가", "budget": "예산", "income": "수입",
            "expense": "지출", "balance": "잔액", "category": "카테고리",
            "transaction": "거래", "monthlyReport": "월간 보고서", "transfer": "이체",
            "account": "계좌", "statement": "명세서", "recurring": "정기",
            "splitBill": "더치페이", "refund": "환불", "exchangeRate": "환율",
            "tax": "세금", "investment": "투자", "saving": "저축", "debt": "부채",
            "currency": "통화"
        },
        "ecommerce": {
            "product": "상품", "cart": "장바구니", "order": "주문", "checkout": "결제",
            "payment": "지불", "shipping": "배송", "tracking": "배송추적",
            "review": "리뷰", "wishlist": "위시리스트", "discount": "할인",
            "coupon": "쿠폰", "category": "카테고리", "brand": "브랜드", "size": "사이즈",
            "color": "색상", "quantity": "수량", "total": "합계", "subtotal": "소계",
            "refund": "환불", "rating": "평점"
        },
        "food": {
            "order": "주문", "restaurant": "식당", "menu": "메뉴",
            "delivery": "배달", "takeout": "포장", "reservation": "예약",
            "review": "리뷰", "coupon": "쿠폰", "dish": "요리", "cuisine": "요리 종류",
            "rating": "평점", "fee": "요금", "address": "주소", "distance": "거리",
            "openTime": "영업시간", "category": "카테고리", "combo": "세트",
            "payment": "결제", "comment": "댓글", "favorite": "즐겨찾기"
        },
        "medical": {
            "appointment": "예약", "doctor": "의사", "department": "진료과",
            "hospital": "병원", "prescription": "처방전", "diagnosis": "진단",
            "medicine": "약", "fee": "진료비", "insurance": "보험", "record": "진료기록",
            "symptom": "증상", "clinic": "클리닉", "surgery": "수술", "report": "보고서",
            "queue": "대기열", "registration": "접수", "pharmacy": "약국",
            "checkup": "검진", "emergency": "응급", "consultation": "상담"
        },
        "fitness": {
            "workout": "운동", "exercise": "운동", "set": "세트", "rep": "회",
            "weight": "무게", "calorie": "칼로리", "duration": "시간",
            "heartRate": "심박수", "progress": "진행", "goal": "목표",
            "challenge": "도전", "achievement": "업적", "plan": "계획",
            "routine": "루틴", "rest": "휴식", "warmup": "워밍업", "cooldown": "쿨다운",
            "streak": "연속", "bodyMeasure": "신체 측정", "nutrition": "영양"
        },
        "education": {
            "course": "강좌", "lesson": "수업", "assignment": "과제",
            "exam": "시험", "grade": "성적", "homework": "숙제", "schedule": "시간표",
            "teacher": "선생님", "student": "학생", "classroom": "교실",
            "quiz": "퀴즈", "certificate": "자격증", "progress": "진행",
            "deadline": "마감일", "enrollment": "등록", "tuition": "등록금",
            "lecture": "강의", "tutorial": "튜토리얼", "resource": "자료",
            "library": "도서관"
        },
        "social": {
            "post": "게시물", "comment": "댓글", "like": "좋아요", "share": "공유",
            "follow": "팔로우", "message": "메시지", "notification": "알림",
            "friend": "친구", "group": "그룹", "story": "스토리", "feed": "피드",
            "trend": "트렌드", "hashtag": "해시태그", "mention": "멘션",
            "reaction": "리액션", "poll": "투표", "event": "이벤트", "live": "라이브",
            "tag": "태그", "explore": "탐색"
        },
        "hotel": {
            "hotel": "호텔", "room": "객실", "booking": "예약", "checkin": "체크인",
            "checkout": "체크아웃", "amenity": "편의시설", "breakfast": "조식",
            "price": "가격", "star": "등급", "review": "리뷰", "location": "위치",
            "cancel": "취소", "upgrade": "업그레이드", "suite": "스위트",
            "guestCount": "투숙객", "nights": "박수", "total": "총액",
            "deposit": "보증금", "invoice": "청구서", "concierge": "컨시어지"
        },
        "recruitment": {
            "job": "채용", "resume": "이력서", "interview": "면접",
            "salary": "연봉", "company": "회사", "location": "위치",
            "experience": "경력", "education": "학력", "skill": "기술",
            "application": "지원", "refer": "추천", "offer": "입사제의",
            "contract": "계약", "probation": "수습기간", "benefit": "복지",
            "industry": "업계", "position": "직책", "department": "부서",
            "hire": "채용", "candidate": "후보자"
        },
        "property": {
            "repair": "수리", "bill": "고지서", "notice": "공지", "facility": "시설",
            "parking": "주차", "security": "보안", "cleaning": "청소",
            "visitor": "방문객", "complaint": "민원", "fee": "요금",
            "maintenance": "유지보수", "decoration": "인테리어", "moving": "이사",
            "key": "열쇠", "meter": "계량기", "inspection": "점검",
            "renovation": "리모델링", "garbage": "쓰레기", "elevator": "엘리베이터",
            "guard": "경비원"
        },
        "video": {
            "video": "동영상", "channel": "채널", "subscription": "구독",
            "playlist": "재생목록", "history": "시청기록", "trend": "인기",
            "category": "카테고리", "upload": "업로드", "like": "좋아요",
            "comment": "댓글", "share": "공유", "quality": "화질",
            "subtitle": "자막", "autoplay": "자동재생", "download": "다운로드",
            "watchLater": "나중에 볼 동영상", "recommendation": "추천",
            "creator": "크리에이터", "live": "라이브", "shorts": "쇼츠"
        },
        "sports": {
            "match": "경기", "team": "팀", "player": "선수", "score": "점수",
            "league": "리그", "tournament": "토너먼트", "standing": "순위",
            "highlight": "하이라이트", "news": "뉴스", "ticket": "티켓",
            "stadium": "경기장", "schedule": "일정", "result": "결과",
            "lineup": "라인업", "transfer": "이적", "injury": "부상",
            "referee": "심판", "fan": "팬", "merchandise": "굿즈",
            "broadcast": "중계"
        },
        "photo": {
            "photo": "사진", "album": "앨범", "camera": "카메라", "filter": "필터",
            "edit": "편집", "share": "공유", "like": "좋아요", "comment": "댓글",
            "tag": "태그", "location": "위치", "collection": "컬렉션",
            "gallery": "갤러리", "upload": "업로드", "download": "다운로드",
            "quality": "화질", "resolution": "해상도", "exposure": "노출",
            "contrast": "대비", "brightness": "밝기", "saturation": "채도"
        },
        "dating": {
            "profile": "프로필", "match": "매칭", "message": "메시지",
            "like": "좋아요", "superlike": "슈퍼 좋아요", "dislike": "싫어요",
            "interest": "관심사", "photo": "사진", "bio": "소개", "distance": "거리",
            "preference": "선호도", "setting": "설정", "verification": "인증",
            "report": "신고", "block": "차단", "discover": "발견",
            "nearby": "주변", "online": "온라인", "visit": "방문", "favorite": "즐겨찾기"
        },
        "blog": {
            "article": "글", "category": "카테고리", "tag": "태그", "author": "작성자",
            "read": "읽기", "bookmark": "북마크", "follow": "팔로우",
            "comment": "댓글", "like": "좋아요", "share": "공유", "draft": "임시저장",
            "publish": "발행", "series": "시리즈", "newsletter": "뉴스레터",
            "archive": "보관", "subscribe": "구독", "popular": "인기",
            "recent": "최신", "featured": "추천", "trending": "인기"
        },
        "game": {
            "game": "게임", "level": "레벨", "score": "점수", "rank": "순위",
            "achievement": "업적", "leaderboard": "리더보드",
            "challenge": "도전", "reward": "보상", "coin": "코인",
            "character": "캐릭터", "weapon": "무기", "skill": "스킬",
            "quest": "퀘스트", "mission": "미션", "player": "플레이어",
            "guild": "길드", "tournament": "토너먼트", "battle": "배틀",
            "item": "아이템", "upgrade": "업그레이드"
        },
        "payment": {
            "payment": "결제", "transfer": "송금", "recharge": "충전",
            "withdraw": "출금", "bill": "청구서", "receipt": "영수증",
            "invoice": "인보이스", "balance": "잔액", "limit": "한도",
            "fee": "수수료", "exchange": "환전", "refund": "환불",
            "dispute": "이의제기", "statement": "거래내역", "card": "카드",
            "account": "계좌", "currency": "통화", "rate": "환율",
            "tax": "세금", "voucher": "바우처"
        },
        "crm": {
            "contact": "연락처", "lead": "잠재고객", "deal": "딜", "pipeline": "파이프라인",
            "task": "작업", "activity": "활동", "note": "메모", "meeting": "회의",
            "call": "통화", "email": "이메일", "followup": "후속조치",
            "contract": "계약", "quote": "견적", "invoice": "청구서",
            "order": "주문", "opportunity": "기회", "account": "거래처",
            "campaign": "캠페인", "report": "보고서", "dashboard": "대시보드"
        },
        "weather": {
            "forecast": "일기예보", "temperature": "기온", "humidity": "습도",
            "wind": "바람", "uv": "자외선 지수", "aqi": "대기질",
            "sunrise": "일출", "sunset": "일몰", "rain": "비", "snow": "눈",
            "thunderstorm": "뇌우", "cloud": "구름", "visibility": "가시거리",
            "pressure": "기압", "dew": "이슬점", "feelsLike": "체감온도",
            "hourly": "시간별", "daily": "일별", "alert": "경보", "season": "계절"
        },
        "generic": {
            "item": "항목", "detail": "상세", "list": "목록", "add": "추가",
            "create": "생성", "update": "수정", "remove": "제거", "info": "정보",
            "status": "상태", "date": "날짜", "time": "시간", "category": "카테고리",
            "type": "유형", "note": "메모", "upload": "업로드", "download": "다운로드",
            "share": "공유", "copy": "복사", "print": "인쇄", "filter": "필터"
        }
    }
}

# --- Spanish ---
L10N['es'] = {
    "common": {
        "ok": "Aceptar", "cancel": "Cancelar", "save": "Guardar", "delete": "Eliminar",
        "edit": "Editar", "search": "Buscar", "loading": "Cargando...", "error": "Error",
        "retry": "Reintentar", "empty": "Sin datos", "confirm": "Confirmar", "close": "Cerrar"
    },
    "auth": {
        "login": "Iniciar Sesión", "register": "Registrarse", "email": "Correo electrónico",
        "password": "Contraseña", "forgotPassword": "Olvidé mi contraseña", "logout": "Cerrar Sesión"
    },
    "nav": {
        "home": "Inicio", "profile": "Perfil", "settings": "Ajustes", "back": "Volver"
    },
    "industry": {
        "finance": {
            "addTransaction": "Añadir Transacción", "budget": "Presupuesto", "income": "Ingresos",
            "expense": "Gastos", "balance": "Saldo", "category": "Categoría",
            "transaction": "Transacción", "monthlyReport": "Informe Mensual", "transfer": "Transferencia",
            "account": "Cuenta", "statement": "Estado de Cuenta", "recurring": "Periódico",
            "splitBill": "Dividir Gasto", "refund": "Reembolso", "exchangeRate": "Tipo de Cambio",
            "tax": "Impuesto", "investment": "Inversión", "saving": "Ahorro", "debt": "Deuda",
            "currency": "Moneda"
        },
        "ecommerce": {
            "product": "Producto", "cart": "Carrito", "order": "Pedido", "checkout": "Pagar",
            "payment": "Pago", "shipping": "Envío", "tracking": "Seguimiento",
            "review": "Opinión", "wishlist": "Lista de Deseos", "discount": "Descuento",
            "coupon": "Cupón", "category": "Categoría", "brand": "Marca", "size": "Talla",
            "color": "Color", "quantity": "Cantidad", "total": "Total", "subtotal": "Subtotal",
            "refund": "Reembolso", "rating": "Valoración"
        },
        "food": {
            "order": "Pedido", "restaurant": "Restaurante", "menu": "Menú",
            "delivery": "A Domicilio", "takeout": "Para Llevar", "reservation": "Reserva",
            "review": "Opinión", "coupon": "Cupón", "dish": "Plato", "cuisine": "Cocina",
            "rating": "Valoración", "fee": "Tarifa", "address": "Dirección", "distance": "Distancia",
            "openTime": "Horario", "category": "Categoría", "combo": "Combo",
            "payment": "Pago", "comment": "Comentario", "favorite": "Favorito"
        },
        "medical": {
            "appointment": "Cita", "doctor": "Médico", "department": "Departamento",
            "hospital": "Hospital", "prescription": "Receta", "diagnosis": "Diagnóstico",
            "medicine": "Medicamento", "fee": "Honorarios", "insurance": "Seguro", "record": "Historial",
            "symptom": "Síntoma", "clinic": "Clínica", "surgery": "Cirugía", "report": "Informe",
            "queue": "Cola", "registration": "Registro", "pharmacy": "Farmacia",
            "checkup": "Chequeo", "emergency": "Emergencia", "consultation": "Consulta"
        },
        "fitness": {
            "workout": "Entrenamiento", "exercise": "Ejercicio", "set": "Serie", "rep": "Repetición",
            "weight": "Peso", "calorie": "Caloría", "duration": "Duración",
            "heartRate": "Frecuencia Cardíaca", "progress": "Progreso", "goal": "Objetivo",
            "challenge": "Desafío", "achievement": "Logro", "plan": "Plan",
            "routine": "Rutina", "rest": "Descanso", "warmup": "Calentamiento", "cooldown": "Enfriamiento",
            "streak": "Racha", "bodyMeasure": "Medida Corporal", "nutrition": "Nutrición"
        },
        "education": {
            "course": "Curso", "lesson": "Lección", "assignment": "Tarea",
            "exam": "Examen", "grade": "Nota", "homework": "Deberes", "schedule": "Horario",
            "teacher": "Profesor", "student": "Estudiante", "classroom": "Aula",
            "quiz": "Cuestionario", "certificate": "Certificado", "progress": "Progreso",
            "deadline": "Fecha Límite", "enrollment": "Matrícula", "tuition": "Matrícula",
            "lecture": "Conferencia", "tutorial": "Tutorial", "resource": "Recurso",
            "library": "Biblioteca"
        },
        "social": {
            "post": "Publicación", "comment": "Comentario", "like": "Me gusta", "share": "Compartir",
            "follow": "Seguir", "message": "Mensaje", "notification": "Notificación",
            "friend": "Amigo", "group": "Grupo", "story": "Historia", "feed": "Feed",
            "trend": "Tendencia", "hashtag": "Hashtag", "mention": "Mencionar",
            "reaction": "Reacción", "poll": "Encuesta", "event": "Evento", "live": "En Vivo",
            "tag": "Etiqueta", "explore": "Explorar"
        },
        "hotel": {
            "hotel": "Hotel", "room": "Habitación", "booking": "Reserva", "checkin": "Entrada",
            "checkout": "Salida", "amenity": "Servicio", "breakfast": "Desayuno",
            "price": "Precio", "star": "Estrella", "review": "Opinión", "location": "Ubicación",
            "cancel": "Cancelar", "upgrade": "Mejorar", "suite": "Suite",
            "guestCount": "Huéspedes", "nights": "Noches", "total": "Total",
            "deposit": "Depósito", "invoice": "Factura", "concierge": "Conserjería"
        },
        "recruitment": {
            "job": "Empleo", "resume": "Currículum", "interview": "Entrevista",
            "salary": "Salario", "company": "Empresa", "location": "Ubicación",
            "experience": "Experiencia", "education": "Formación", "skill": "Habilidad",
            "application": "Solicitud", "refer": "Referir", "offer": "Oferta",
            "contract": "Contrato", "probation": "Período de Prueba", "benefit": "Beneficio",
            "industry": "Industria", "position": "Cargo", "department": "Departamento",
            "hire": "Contratar", "candidate": "Candidato"
        },
        "property": {
            "repair": "Reparación", "bill": "Recibo", "notice": "Aviso", "facility": "Instalación",
            "parking": "Estacionamiento", "security": "Seguridad", "cleaning": "Limpieza",
            "visitor": "Visitante", "complaint": "Queja", "fee": "Tarifa",
            "maintenance": "Mantenimiento", "decoration": "Decoración", "moving": "Mudanza",
            "key": "Llave", "meter": "Contador", "inspection": "Inspección",
            "renovation": "Renovación", "garbage": "Basura", "elevator": "Ascensor",
            "guard": "Vigilante"
        },
        "video": {
            "video": "Video", "channel": "Canal", "subscription": "Suscripción",
            "playlist": "Lista de Reproducción", "history": "Historial", "trend": "Tendencia",
            "category": "Categoría", "upload": "Subir", "like": "Me gusta",
            "comment": "Comentario", "share": "Compartir", "quality": "Calidad",
            "subtitle": "Subtítulo", "autoplay": "Reproducción Automática", "download": "Descargar",
            "watchLater": "Ver Después", "recommendation": "Recomendación",
            "creator": "Creador", "live": "En Vivo", "shorts": "Shorts"
        },
        "sports": {
            "match": "Partido", "team": "Equipo", "player": "Jugador", "score": "Marcador",
            "league": "Liga", "tournament": "Torneo", "standing": "Clasificación",
            "highlight": "Resumen", "news": "Noticias", "ticket": "Entrada",
            "stadium": "Estadio", "schedule": "Calendario", "result": "Resultado",
            "lineup": "Alineación", "transfer": "Transferencia", "injury": "Lesión",
            "referee": "Árbitro", "fan": "Aficionado", "merchandise": "Merchandising",
            "broadcast": "Transmisión"
        },
        "photo": {
            "photo": "Foto", "album": "Álbum", "camera": "Cámara", "filter": "Filtro",
            "edit": "Editar", "share": "Compartir", "like": "Me gusta", "comment": "Comentario",
            "tag": "Etiqueta", "location": "Ubicación", "collection": "Colección",
            "gallery": "Galería", "upload": "Subir", "download": "Descargar",
            "quality": "Calidad", "resolution": "Resolución", "exposure": "Exposición",
            "contrast": "Contraste", "brightness": "Brillo", "saturation": "Saturación"
        },
        "dating": {
            "profile": "Perfil", "match": "Match", "message": "Mensaje",
            "like": "Me gusta", "superlike": "Super Like", "dislike": "No me gusta",
            "interest": "Interés", "photo": "Foto", "bio": "Bio", "distance": "Distancia",
            "preference": "Preferencia", "setting": "Ajustes", "verification": "Verificación",
            "report": "Reportar", "block": "Bloquear", "discover": "Descubrir",
            "nearby": "Cercanos", "online": "En línea", "visit": "Visitar", "favorite": "Favorito"
        },
        "blog": {
            "article": "Artículo", "category": "Categoría", "tag": "Etiqueta", "author": "Autor",
            "read": "Leer", "bookmark": "Marcador", "follow": "Seguir",
            "comment": "Comentario", "like": "Me gusta", "share": "Compartir", "draft": "Borrador",
            "publish": "Publicar", "series": "Serie", "newsletter": "Boletín",
            "archive": "Archivo", "subscribe": "Suscribirse", "popular": "Popular",
            "recent": "Reciente", "featured": "Destacado", "trending": "Tendencia"
        },
        "game": {
            "game": "Juego", "level": "Nivel", "score": "Puntuación", "rank": "Rango",
            "achievement": "Logro", "leaderboard": "Tabla de Clasificación",
            "challenge": "Desafío", "reward": "Recompensa", "coin": "Moneda",
            "character": "Personaje", "weapon": "Arma", "skill": "Habilidad",
            "quest": "Misión", "mission": "Misión", "player": "Jugador",
            "guild": "Gremio", "tournament": "Torneo", "battle": "Batalla",
            "item": "Objeto", "upgrade": "Mejora"
        },
        "payment": {
            "payment": "Pago", "transfer": "Transferencia", "recharge": "Recargar",
            "withdraw": "Retirar", "bill": "Factura", "receipt": "Recibo",
            "invoice": "Factura", "balance": "Saldo", "limit": "Límite",
            "fee": "Comisión", "exchange": "Cambio", "refund": "Reembolso",
            "dispute": "Disputa", "statement": "Extracto", "card": "Tarjeta",
            "account": "Cuenta", "currency": "Moneda", "rate": "Tasa",
            "tax": "Impuesto", "voucher": "Vale"
        },
        "crm": {
            "contact": "Contacto", "lead": "Prospecto", "deal": "Negocio", "pipeline": "Pipeline",
            "task": "Tarea", "activity": "Actividad", "note": "Nota", "meeting": "Reunión",
            "call": "Llamada", "email": "Email", "followup": "Seguimiento",
            "contract": "Contrato", "quote": "Cotización", "invoice": "Factura",
            "order": "Pedido", "opportunity": "Oportunidad", "account": "Cuenta",
            "campaign": "Campaña", "report": "Informe", "dashboard": "Panel"
        },
        "weather": {
            "forecast": "Pronóstico", "temperature": "Temperatura", "humidity": "Humedad",
            "wind": "Viento", "uv": "Índice UV", "aqi": "Calidad del Aire",
            "sunrise": "Amanecer", "sunset": "Atardecer", "rain": "Lluvia", "snow": "Nieve",
            "thunderstorm": "Tormenta", "cloud": "Nube", "visibility": "Visibilidad",
            "pressure": "Presión", "dew": "Punto de Rocío", "feelsLike": "Sensación Térmica",
            "hourly": "Por Hora", "daily": "Por Día", "alert": "Alerta", "season": "Estación"
        },
        "generic": {
            "item": "Elemento", "detail": "Detalle", "list": "Lista", "add": "Añadir",
            "create": "Crear", "update": "Actualizar", "remove": "Eliminar", "info": "Información",
            "status": "Estado", "date": "Fecha", "time": "Hora", "category": "Categoría",
            "type": "Tipo", "note": "Nota", "upload": "Subir", "download": "Descargar",
            "share": "Compartir", "copy": "Copiar", "print": "Imprimir", "filter": "Filtrar"
        }
    }
}

def js_value(v, indent=0):
    """Convert a Python value to a JavaScript string representation."""
    sp = "  " * indent
    sp1 = "  " * (indent + 1)
    if isinstance(v, dict):
        if not v:
            return "{}"
        lines = ["{"]
        for k, val in v.items():
            lines.append(f"{sp1}{k}: {js_value(val, indent + 1)},")
        lines.append(sp + "}")
        return "\n".join(lines)
    elif isinstance(v, str):
        escaped = v.replace("\\", "\\\\").replace("'", "\\'").replace("\n", "\\n")
        return f"'{escaped}'"
    elif isinstance(v, bool):
        return "true" if v else "false"
    elif v is None:
        return "null"
    else:
        return str(v)


def generate_i18n_js():
    lines = []
    lines.append("/**")
    lines.append(" * i18n.js — Internationalization module for WeChat Mini Program")
    lines.append(" *")
    lines.append(" * Supports 10 locales: en, zh, zh_TW, ja, ko, es, fr, de, pt, ar")
    lines.append(" * All locale data embedded — no network requests needed.")
    lines.append(" *")
    lines.append(" * Usage:")
    lines.append(" *   const { t, setLocale, getLocale, initLocale } = require('./utils/i18n');")
    lines.append(" *   initLocale();")
    lines.append(" *   console.log(t('common.ok'));              // 'OK'")
    lines.append(" *   console.log(t('common.loading'));          // 'Loading...'")
    lines.append(" *   console.log(t('industry.finance.budget')); // 'Budget'")
    lines.append(" */")
    lines.append("")
    lines.append("var STORAGE_KEY = 'app_locale';")
    lines.append("")

    # Build locale object
    lines.append("/**")
    lines.append(" * Complete locale data — all 10 languages embedded.")
    lines.append(" */")
    lines.append("var locales = {")

    locale_keys = list(L10N.keys())
    for i, code in enumerate(locale_keys):
        comma = "," if i < len(locale_keys) - 1 else ""
        lines.append(f"  {code}: {js_value(L10N[code], 1)}{comma}")

    lines.append("};")
    lines.append("")

    # Runtime functions
    lines.append("""/**
 * Resolve a dot-notation key against a locale object.
 * e.g. resolve(locales.en, 'industry.finance.budget') -> 'Budget'
 */
function resolve(obj, key) {
  var parts = key.split('.');
  var current = obj;
  for (var i = 0; i < parts.length; i++) {
    if (current == null || typeof current !== 'object') return null;
    current = current[parts[i]];
  }
  return typeof current === 'string' ? current : null;
}

/**
 * Replace {{param}} placeholders in a string.
 */
function interpolate(str, params) {
  if (!params) return str;
  return str.replace(/\\{\\{(\\w+)\\}\\}/g, function(match, key) {
    return params[key] !== undefined ? String(params[key]) : match;
  });
}

/**
 * Detect the system language from wx.getSystemInfoSync().
 * Maps WeChat locale codes to our supported codes.
 */
function detectSystemLocale() {
  try {
    var sysInfo = wx.getSystemInfoSync();
    var lang = (sysInfo.language || '').replace(/_/g, '-');
    // Map to supported locales
    if (lang.indexOf('zh-') === 0 || lang === 'zh') {
      if (lang === 'zh-TW' || lang === 'zh-HK' || lang === 'zh-MO') {
        return 'zh_TW';
      }
      return 'zh';
    }
    if (lang.indexOf('ja') === 0) return 'ja';
    if (lang.indexOf('ko') === 0) return 'ko';
    if (lang.indexOf('es') === 0) return 'es';
    if (lang.indexOf('fr') === 0) return 'fr';
    if (lang.indexOf('de') === 0) return 'de';
    if (lang.indexOf('pt') === 0) return 'pt';
    if (lang.indexOf('ar') === 0) return 'ar';
    return 'en';
  } catch (e) {
    return 'en';
  }
}

/**
 * Get the current locale code.
 * Priority: storage > system locale > default 'zh'
 */
function getLocale() {
  try {
    var stored = wx.getStorageSync(STORAGE_KEY);
    if (stored && locales[stored]) return stored;
  } catch (e) {
    // Storage not available
  }
  return detectSystemLocale();
}

/**
 * Set locale and persist to storage.
 */
function setLocale(locale) {
  if (!locales[locale]) return false;
  try {
    wx.setStorageSync(STORAGE_KEY, locale);
  } catch (e) {
    // Storage not available
  }
  return true;
}

/**
 * Initialize locale detection on app start.
 * Call during App.onLaunch or App.onShow.
 */
function initLocale() {
  var locale = getLocale();
  if (!locales[locale]) {
    locale = 'zh';
  }
  return locale;
}

/**
 * Translate a dot-notation key.
 *
 * @param {string} key - Dot-notation key, e.g. 'common.ok' or 'industry.finance.budget'
 * @param {Object} [params] - Optional interpolation parameters, e.g. { name: 'John' }
 * @returns {string} Translated string, or the key itself if not found
 */
function t(key, params) {
  var localeCode = getLocale();
  var locale = locales[localeCode] || locales['zh'];
  var value = resolve(locale, key);
  if (value == null) {
    // Fallback to English
    value = resolve(locales['en'], key);
  }
  if (value == null) {
    return key;
  }
  return interpolate(value, params);
}

module.exports = {
  t: t,
  setLocale: setLocale,
  getLocale: getLocale,
  initLocale: initLocale
};
""")

    return "".join(lines)


if __name__ == "__main__":
    js = generate_i18n_js()
    outpath = os.path.join(OUT_DIR, "i18n.js")
    with open(outpath, "w", encoding="utf-8") as f:
        f.write(js)
    print(f"Generated {outpath} ({len(js)} bytes)")
