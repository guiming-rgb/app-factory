# 20 个行业模板

App 生产工厂内置 **20 个行业模板**，覆盖电商、社交、企业工具、教育、金融、医疗、游戏等主流领域。每个模板都包含预定义的页面结构、数据实体和字段，可直接使用或作为定制起点。

## 模板概览

| # | ID | 名称 | 分类 | 图标 | 页面数 | 实体数 |
|---|-----|------|------|:----:|:----:|:----:|
| 1 | `ecommerce` | 电商商城 | 电商 | 🛒 | 8 | 4 |
| 2 | `social` | 社交社区 | 社交 | 💬 | 6 | 2 |
| 3 | `crm` | 客户管理 | 企业 | 📊 | 7 | 3 |
| 4 | `blog` | 博客阅读 | 内容 | 📝 | 6 | 2 |
| 5 | `fitness` | 健身助手 | 健康 | 💪 | 6 | 4 |
| 6 | `food_delivery` | 外卖点餐 | 电商 | 🍕 | 7 | 5 |
| 7 | `hotel_booking` | 酒店预订 | 旅游 | 🏨 | 6 | 2 |
| 8 | `recruitment` | 招聘求职 | 企业 | 💼 | 7 | 3 |
| 9 | `property` | 智慧物业 | 企业 | 🏠 | 7 | 5 |
| 10 | `schedule` | 课程助手 | 教育 | 📚 | 6 | 4 |
| 11 | `entertainment` | 影音娱乐 | 内容 | 🎬 | 7 | 1 |
| 12 | `finance_tracker` | 记账理财 | 金融 | 💰 | 7 | 3 |
| 13 | `medical_appointment` | 在线问诊 | 医疗 | 🏥 | 8 | 4 |
| 14 | `weather` | 天气预报 | 工具 | 🌤️ | 7 | 2 |
| 15 | `sports` | 体育赛事 | 内容 | ⚽ | 7 | 4 |
| 16 | `photo_share` | 照片社区 | 社交 | 📸 | 5 | 2 |
| 17 | `dating` | 交友匹配 | 社交 | 💕 | 6 | 2 |
| 18 | `game` | 游戏中心 | 游戏 | 🎮 | 6 | 3 |
| 19 | `payment` | 收银支付 | 金融 | 💳 | 6 | 2 |
| 20 | `finance` | 金融理财 | 金融 | 💹 | 7 | 4 |

---

## 1. 电商商城 🛒

**对标：** 淘宝 / 拼多多 / 京东

**页面结构（8 页）：**

| 页面 ID | 类型 | 说明 | 关联实体 |
|---------|:----:|------|:-------:|
| `home` | card_grid | 首页推荐 | — |
| `category_list` | list | 分类浏览 | category |
| `product_list` | list | 商品列表 | product |
| `product_detail` | detail | 商品详情 | product |
| `cart` | list | 购物车 | cart_item |
| `checkout` | payment | 结算支付 | — |
| `order_list` | list | 订单列表 | order |
| `profile` | placeholder | 个人中心 | — |

**数据实体：**

| 实体 | 关键字段 | 关系 |
|------|---------|------|
| `category` | id, name, icon, sort_order | — |
| `product` | id, category_id, name, price, original_price, images, description, sales, rating, stock | belongs_to: category |
| `cart_item` | id, user_id, product_id, qty, selected | belongs_to: product |
| `order` | id, user_id, total, status, address, tracking_number | — |

**底部 Tab：** 首页 / 分类 / 购物车 / 我的

**限制：** 支付需 Stripe 配置；商品图片需 CDN

---

## 2. 社交社区 💬

**对标：** 小红书 / 微博 / 朋友圈

**页面结构（6 页）：**

| 页面 ID | 类型 | 说明 | 关联实体 |
|---------|:----:|------|:-------:|
| `feed` | list | 发现页 | post |
| `post_detail` | detail | 详情页 | post |
| `create_post` | form | 发布页 | post |
| `topic_list` | list | 话题列表 | topic |
| `chat_list` | chat | 消息列表 | — |
| `profile` | placeholder | 个人中心 | — |

**数据实体：**

| 实体 | 关键字段 |
|------|---------|
| `post` | id, user_id, content, images, topic_id, likes, comments, shares |
| `topic` | id, name, cover, post_count |

**底部 Tab：** 发现 / 话题 / 消息 / 我的

**限制：** 聊天需 Realtime；视频需 CDN

---

## 3. 客户管理 CRM 📊

**对标：** Salesforce / 纷享销客

**页面结构（7 页）：**

| 页面 ID | 类型 | 说明 | 关联实体 |
|---------|:----:|------|:-------:|
| `client_list` | list | 客户列表 | client |
| `client_detail` | detail | 客户详情 | client |
| `add_client` | form | 添加客户 | client |
| `opportunity_list` | list | 商机列表 | opportunity |
| `activity_list` | list | 跟进记录 | activity |
| `dashboard` | dashboard | 销售报表 | — |
| `profile` | placeholder | 我的 | — |

**数据实体：**

| 实体 | 关键字段 | 关系 |
|------|---------|------|
| `client` | id, name, industry, phone, email, source, stage | — |
| `opportunity` | id, client_id, name, amount, stage, close_date, probability | belongs_to: client |
| `activity` | id, client_id, type, content, next_remind | belongs_to: client |

**底部 Tab：** 客户 / 商机 / 统计 / 我的

**限制：** 图表需自定义；邮件集成需第三方

---

## 4. 博客阅读 📝

**对标：** Medium / 知乎 / 简书

**页面结构（6 页）：**

| 页面 ID | 类型 | 说明 | 关联实体 |
|---------|:----:|------|:-------:|
| `feed` | list | 推荐列表 | article |
| `article_detail` | detail | 文章阅读 | article |
| `category_list` | list | 分类列表 | category |
| `bookmarks` | list | 收藏列表 | article |
| `search` | form | 搜索 | — |
| `profile` | placeholder | 我的 | — |

**数据实体：**

| 实体 | 关键字段 | 关系 |
|------|---------|------|
| `category` | id, name, icon | — |
| `article` | id, author_id, title, summary, content, cover, category_id, tags, read_minutes, likes, bookmarks | belongs_to: category |

**底部 Tab：** 推荐 / 分类 / 收藏 / 我的

**限制：** 富文本编辑器需额外组件

---

## 5. 健身助手 💪

**对标：** Keep / MyFitnessPal

**页面结构（6 页）：**

| 页面 ID | 类型 | 说明 | 关联实体 |
|---------|:----:|------|:-------:|
| `today` | dashboard | 今日概况 | — |
| `course_list` | list | 课程列表 | course |
| `exercise_lib` | list | 动作库 | exercise |
| `workout_log` | list | 训练记录 | workout |
| `body_stats` | list | 身体数据 | body_measure |
| `profile` | placeholder | 我的 | — |

**数据实体：**

| 实体 | 关键字段 | 关系 |
|------|---------|------|
| `course` | id, name, level, duration_min, calories, cover | — |
| `exercise` | id, name, body_part, gif_url, instructions | — |
| `workout` | id, user_id, course_id, duration_min, calories, date | belongs_to: course |
| `body_measure` | id, user_id, weight, body_fat, chest, waist, date | — |

**底部 Tab：** 今日 / 课程 / 记录 / 我的

**限制：** 动作 GIF 需 CDN；图表需额外开发

---

## 6. 外卖点餐 🍕

**对标：** 美团 / Uber Eats

**页面结构（7 页）：**

| 页面 ID | 类型 | 说明 | 关联实体 |
|---------|:----:|------|:-------:|
| `home` | card_grid | 首页推荐 | — |
| `restaurant_list` | list | 商家列表 | restaurant |
| `menu` | list | 菜单点餐 | menu_item |
| `cart` | list | 购物车 | cart_item |
| `order_list` | list | 订单列表 | order |
| `coupon_list` | list | 优惠券 | coupon |
| `profile` | placeholder | 我的 | — |

**数据实体：**

| 实体 | 关键字段 | 关系 |
|------|---------|------|
| `restaurant` | id, name, cuisine, rating, delivery_time, delivery_fee, min_order, logo | — |
| `menu_item` | id, restaurant_id, name, price, image, description, sales | belongs_to: restaurant |
| `cart_item` | id, user_id, menu_item_id, qty | belongs_to: menu_item |
| `order` | id, user_id, restaurant_id, total, status, rider_name, eta_min | belongs_to: restaurant |
| `coupon` | id, user_id, code, discount, min_order, expire_at | — |

**底部 Tab：** 首页 / 商家 / 订单 / 我的

**限制：** 支付需 Stripe；实时配送需第三方

---

## 7. 酒店预订 🏨

**对标：** 携程 / Booking.com

**页面结构（6 页）：**

| 页面 ID | 类型 | 说明 | 关联实体 |
|---------|:----:|------|:-------:|
| `search` | form | 搜索筛选 | — |
| `hotel_list` | list | 酒店列表 | hotel |
| `hotel_detail` | detail | 酒店详情 | hotel |
| `booking` | form | 预订 | booking |
| `my_bookings` | list | 我的订单 | booking |
| `profile` | placeholder | 我的 | — |

**数据实体：**

| 实体 | 关键字段 | 关系 |
|------|---------|------|
| `hotel` | id, name, city, address, stars, rating, price_from, images, amenities, latitude, longitude | — |
| `booking` | id, user_id, hotel_id, room_type, check_in, check_out, guests, total_price, status | belongs_to: hotel |

**底部 Tab：** 搜索 / 酒店 / 订单 / 我的

**限制：** 真实酒店数据需第三方 API

---

## 8. 招聘求职 💼

**对标：** BOSS 直聘 / LinkedIn

**页面结构（7 页）：**

| 页面 ID | 类型 | 说明 | 关联实体 |
|---------|:----:|------|:-------:|
| `job_list` | list | 职位列表 | job |
| `job_detail` | detail | 职位详情 | job |
| `company_list` | list | 公司列表 | company |
| `apply` | form | 投递简历 | application |
| `my_applications` | list | 我的投递 | application |
| `chat` | chat | 在线沟通 | — |
| `profile` | placeholder | 我的 | — |

**数据实体：**

| 实体 | 关键字段 | 关系 |
|------|---------|------|
| `company` | id, name, industry, size, logo, description | — |
| `job` | id, company_id, title, salary_min, salary_max, location, experience, education, skills | belongs_to: company |
| `application` | id, user_id, job_id, resume_url, status | belongs_to: job |

**底部 Tab：** 职位 / 公司 / 沟通 / 我的

**限制：** 在线沟通需 Realtime；简历解析需第三方

---

## 9. 智慧物业 🏠

**对标：** 彩生活 / 碧桂园服务

**页面结构（7 页）：**

| 页面 ID | 类型 | 说明 | 关联实体 |
|---------|:----:|------|:-------:|
| `home` | card_grid | 服务首页 | — |
| `repair_list` | list | 报修列表 | repair |
| `payment_list` | list | 缴费列表 | payment |
| `notice_list` | list | 公告列表 | notice |
| `visitor_list` | list | 访客记录 | visitor |
| `facility_book` | list | 设施预约 | facility |
| `profile` | placeholder | 我的 | — |

**数据实体：**

| 实体 | 关键字段 |
|------|---------|
| `repair` | id, user_id, title, description, images, status, urgency |
| `payment` | id, user_id, type, amount, period, status |
| `notice` | id, title, content, importance |
| `visitor` | id, user_id, name, phone, visit_date, status |
| `facility` | id, name, type, capacity |

**底部 Tab：** 首页 / 报修 / 公告 / 我的

**限制：** 支付需对接物业系统

---

## 10. 课程助手 📚

**对标：** 超级课程表 / Google Classroom

**页面结构（6 页）：**

| 页面 ID | 类型 | 说明 | 关联实体 |
|---------|:----:|------|:-------:|
| `timetable` | calendar | 课程表 | — |
| `course_list` | list | 课程列表 | course |
| `homework_list` | list | 作业列表 | homework |
| `exam_list` | list | 考试列表 | exam |
| `grade_list` | list | 成绩列表 | grade |
| `profile` | placeholder | 我的 | — |

**数据实体：**

| 实体 | 关键字段 | 关系 |
|------|---------|------|
| `course` | id, name, teacher, classroom, day_of_week, start_time, end_time, color | — |
| `homework` | id, course_id, title, description, due_date, status, attachment | belongs_to: course |
| `exam` | id, course_id, name, date, location, duration_min | belongs_to: course |
| `grade` | id, course_id, user_id, score, total, type | belongs_to: course |

**底部 Tab：** 课表 / 作业 / 考试 / 我的

**限制：** 周视图需自定义组件；推送需额外配置

---

## 11. 影音娱乐 🎬

**对标：** Netflix / 腾讯视频

**页面结构（7 页）：**

| 页面 ID | 类型 | 说明 | 关联实体 |
|---------|:----:|------|:-------:|
| `home` | card_grid | 首页推荐 | — |
| `video_list` | list | 分类浏览 | video |
| `video_detail` | detail | 播放页 | video |
| `search` | form | 搜索 | — |
| `favorites` | list | 收藏列表 | video |
| `history` | list | 历史记录 | video |
| `profile` | placeholder | 我的 | — |

**数据实体：**

| 实体 | 关键字段 |
|------|---------|
| `video` | id, title, description, url, thumbnail, duration, category, views, rating |

**底部 Tab：** 首页 / 分类 / 收藏 / 我的

**限制：** 视频 CDN 需第三方；DRM 需额外开发

---

## 12. 记账理财 💰

**对标：** 随手记 / Mint / YNAB

**页面结构（7 页）：**

| 页面 ID | 类型 | 说明 | 关联实体 |
|---------|:----:|------|:-------:|
| `home` | dashboard | 资产总览 | — |
| `transaction_list` | list | 账单列表 | transaction |
| `add_transaction` | form | 记一笔 | transaction |
| `account_list` | list | 账户管理 | account |
| `budget_list` | list | 预算管理 | budget |
| `report` | chart | 报表统计 | — |
| `profile` | placeholder | 我的 | — |

**数据实体：**

| 实体 | 关键字段 | 关系 |
|------|---------|------|
| `account` | id, user_id, name, type, balance, currency, icon | — |
| `transaction` | id, user_id, account_id, amount, type, category, note, date | belongs_to: account |
| `budget` | id, user_id, category, limit_amount, spent, month | — |

**底部 Tab：** 总览 / 账单 / 报表 / 我的

**限制：** 图表需自定义；银行同步需 Plaid

---

## 13. 在线问诊 🏥

**对标：** 平安好医生 / 春雨医生

**页面结构（8 页）：**

| 页面 ID | 类型 | 说明 | 关联实体 |
|---------|:----:|------|:-------:|
| `home` | card_grid | 首页 | — |
| `department_list` | list | 科室列表 | department |
| `doctor_list` | list | 医生列表 | doctor |
| `doctor_detail` | detail | 医生详情 | doctor |
| `appointment` | form | 预约挂号 | appointment |
| `my_appointments` | list | 我的预约 | appointment |
| `records` | list | 病历记录 | medical_record |
| `profile` | placeholder | 我的 | — |

**数据实体：**

| 实体 | 关键字段 | 关系 |
|------|---------|------|
| `department` | id, name, icon, description | — |
| `doctor` | id, department_id, name, title, hospital, rating, consultation_fee, avatar, bio | belongs_to: department |
| `appointment` | id, user_id, doctor_id, date, type, status | belongs_to: doctor |
| `medical_record` | id, user_id, doctor_id, diagnosis, prescription, date | belongs_to: doctor |

**底部 Tab：** 首页 / 科室 / 预约 / 我的

**限制：** 视频问诊需 WebRTC；处方合规需医疗资质

---

## 14. 天气预报 🌤️

**对标：** 墨迹天气 / Weather.com

**页面结构（7 页）：**

| 页面 ID | 类型 | 说明 | 关联实体 |
|---------|:----:|------|:-------:|
| `today` | dashboard | 今日天气 | — |
| `hourly` | list | 逐小时预报 | forecast |
| `forecast` | list | 15 日预报 | forecast |
| `city_list` | list | 城市管理 | city |
| `aqi` | card_grid | 空气质量 | — |
| `life_index` | card_grid | 生活指数 | — |
| `profile` | placeholder | 我的 | — |

**数据实体：**

| 实体 | 关键字段 |
|------|---------|
| `city` | id, name, country, latitude, longitude, is_current |
| `forecast` | id, city_id, date, temp_high, temp_low, condition, humidity, wind_speed, aqi |

**底部 Tab：** 今日 / 预报 / 城市 / 我的

**限制：** 真实天气需 OpenWeatherMap API

---

## 15. 体育赛事 ⚽

**对标：** 懂球帝 / ESPN

**页面结构（7 页）：**

| 页面 ID | 类型 | 说明 | 关联实体 |
|---------|:----:|------|:-------:|
| `live` | card_grid | 直播/实时 | — |
| `match_list` | list | 赛程列表 | match |
| `match_detail` | detail | 比赛详情 | match |
| `standings` | list | 积分榜 | standing |
| `team_list` | list | 球队列表 | team |
| `news_list` | list | 资讯列表 | news |
| `profile` | placeholder | 我的 | — |

**数据实体：**

| 实体 | 关键字段 | 关系 |
|------|---------|------|
| `team` | id, name, logo, league | — |
| `match` | id, home_team_id, away_team_id, home_score, away_score, date, status, venue | belongs_to: team (x2) |
| `standing` | id, team_id, league, points, played, won, drawn, lost, goals_for, goals_against | belongs_to: team |
| `news` | id, title, summary, content, image, source | — |

**底部 Tab：** 直播 / 赛程 / 积分榜 / 我的

**限制：** 实时数据需第三方 API；直播需流媒体

---

## 16. 照片社区 📸

**对标：** Instagram / Pinterest

**页面结构（5 页）：**

| 页面 ID | 类型 | 说明 | 关联实体 |
|---------|:----:|------|:-------:|
| `discover` | list | 发现页 | photo |
| `photo_detail` | detail | 照片详情 | photo |
| `upload` | form | 发布照片 | photo |
| `challenge_list` | list | 话题挑战 | challenge |
| `profile` | placeholder | 我的 | — |

**数据实体：**

| 实体 | 关键字段 |
|------|---------|
| `photo` | id, user_id, image_url, caption, filter, location, tags, likes, comments, saves |
| `challenge` | id, name, description, cover, start_date, end_date |

**底部 Tab：** 发现 / 话题 / 发布 / 我的

**限制：** 图片上传需 Storage；滤镜需额外开发

---

## 17. 交友匹配 💕

**对标：** Tinder / 探探 / Bumble

**页面结构（6 页）：**

| 页面 ID | 类型 | 说明 | 关联实体 |
|---------|:----:|------|:-------:|
| `discover` | card_grid | 滑动发现 | — |
| `profile_detail` | detail | 用户资料 | user_profile |
| `edit_profile` | form | 编辑资料 | user_profile |
| `matches` | list | 匹配列表 | match |
| `chat` | chat | 聊天 | — |
| `my_profile` | placeholder | 我的 | — |

**数据实体：**

| 实体 | 关键字段 |
|------|---------|
| `user_profile` | id, user_id, display_name, bio, photos, age, gender, interests, location, verified |
| `match` | id, user_id, matched_user_id, status, matched_at |

**底部 Tab：** 发现 / 匹配 / 聊天 / 我的

**限制：** 滑动动画需自定义；匹配算法需定制；KYC 需第三方

---

## 18. 游戏中心 🎮

**对标：** TapTap / 4399

**页面结构（6 页）：**

| 页面 ID | 类型 | 说明 | 关联实体 |
|---------|:----:|------|:-------:|
| `game_hub` | card_grid | 游戏大厅 | — |
| `game_detail` | detail | 游戏详情 | game |
| `leaderboard` | list | 排行榜 | game_score |
| `achievements` | card_grid | 成就系统 | — |
| `match_history` | list | 对战记录 | match_record |
| `profile` | placeholder | 我的 | — |

**数据实体：**

| 实体 | 关键字段 | 关系 |
|------|---------|------|
| `game` | id, name, genre, icon, description, rating, player_count, is_online | — |
| `game_score` | id, user_id, game_id, score, level, played_at | belongs_to: game |
| `match_record` | id, user_id, game_id, opponent_id, result, score_diff, played_at | belongs_to: game |

**底部 Tab：** 大厅 / 排行榜 / 对战 / 我的

**限制：** 在线对战需 WebSocket；支付需 Stripe

---

## 19. 收银支付 💳

**对标：** 支付宝 / 微信支付 / Stripe

**页面结构（6 页）：**

| 页面 ID | 类型 | 说明 | 关联实体 |
|---------|:----:|------|:-------:|
| `balance` | dashboard | 余额总览 | — |
| `transaction_list` | list | 交易记录 | transaction |
| `payment_methods` | list | 支付方式 | payment_method |
| `transfer` | form | 转账 | — |
| `qr_code` | card_grid | 收款码 | — |
| `profile` | placeholder | 我的 | — |

**数据实体：**

| 实体 | 关键字段 |
|------|---------|
| `payment_method` | id, user_id, type, brand, last4, expiry, is_default |
| `transaction` | id, user_id, type, amount, category, note, status, date |

**底部 Tab：** 余额 / 账单 / 支付 / 我的

**限制：** 实时支付需银行 API；KYC 需第三方；退款需额外开发

---

## 20. 金融理财 💹

**对标：** 同花顺 / Robinhood

**页面结构（7 页）：**

| 页面 ID | 类型 | 说明 | 关联实体 |
|---------|:----:|------|:-------:|
| `home` | dashboard | 资产总览 | — |
| `portfolio` | list | 投资组合 | investment |
| `stock_detail` | detail | 股票详情 | investment |
| `trade` | form | 买卖交易 | transaction |
| `transaction_history` | list | 交易记录 | transaction |
| `market_news` | list | 市场资讯 | news |
| `profile` | placeholder | 我的 | — |

**数据实体：**

| 实体 | 关键字段 | 关系 |
|------|---------|------|
| `investment` | id, user_id, symbol, name, type, shares, avg_price, current_price | — |
| `transaction` | id, user_id, investment_id, type, shares, price, total, date | belongs_to: investment |
| `news` | id, title, summary, source, url, sentiment, date | — |

**底部 Tab：** 总览 / 组合 / 交易 / 我的

**限制：** 实时行情需第三方 API；交易需券商接口

---

## 使用模板

### 通过 API 使用

```bash
# 列出所有模板
curl https://your-app.com/api/templates

# 获取单个模板详情
curl https://your-app.com/api/templates?id=ecommerce

# 从模板创建项目
curl -X POST https://your-app.com/api/templates \
  -H "Content-Type: application/json" \
  -d '{"templateId": "ecommerce", "title": "我的电商"}'
```

### 通过 Web UI 使用

1. 登录 Web 控制台
2. 点击"新建项目"
3. 选择"从模板创建"
4. 浏览模板列表并选择一个行业
5. 调整项目标题并确认

### 自定义模板

创建项目后，可以在 Spec 编辑器中自由修改：

- **添加/删除页面** — 调整页面类型和排序
- **修改实体字段** — 添加、删除或编辑字段类型
- **调整导航** — 修改底部 Tab 配置
- **更改主题色** — 选择合适的主题色

---

## 最佳实践

1. **从小做起** — 先用模板创建 MVP，再逐步添加功能
2. **充分利用实体关系** — `belongs_to` / `has_many` 关系驱动自动 CRUD
3. **注意平台差异** — 微信小程序不支持所有原生功能（如 WebRTC）
4. **先编辑 Spec，再生成代码** — 修改 Spec 比修改生成的代码成本低得多
5. **版本管理** — 在修改前保存 Spec 版本，方便回退
