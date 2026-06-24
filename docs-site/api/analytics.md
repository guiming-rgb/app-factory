# Analytics API

Analytics API 允许你记录和查询应用使用数据，包括页面浏览、自定义事件、错误追踪和用户活跃度。

## 认证

Analytics 使用独立的 API Key 认证机制，与应用用户认证分开：

```http
x-analytics-key: <analytics_api_key>
```

`ANALYTICS_API_KEY` 在服务端通过环境变量配置。

---

## 事件追踪

### 记录事件

```http
POST /api/analytics/events
Content-Type: application/json
x-analytics-key: <app_id>

{
  "events": [
    {
      "app_id": "project_xxx",
      "event_type": "screen_view",
      "event_name": "home_page",
      "screen_name": "首页",
      "properties": {
        "source": "tab_click",
        "duration_ms": 2500
      },
      "user_id": "user_xxx",
      "session_id": "sess_abc",
      "device_info": {
        "platform": "ios",
        "os_version": "17.0",
        "device_model": "iPhone 15"
      },
      "timestamp": "2024-06-25T10:00:00Z"
    }
  ]
}
```

**认证：** 通过 `x-analytics-key` 头部传递 `app_id`

**支持的事件类型：**

| 类型 | 说明 |
|------|------|
| `screen_view` | 页面浏览 |
| `custom_event` | 自定义事件 |
| `error` | 错误/异常 |
| `user_property` | 用户属性更新 |
| `session_start` | 会话开始 |
| `session_end` | 会话结束 |

**请求限制：**

- 每批最多 100 个事件
- 每分钟每个 app_id 最多 1000 个事件
- 超出限制返回 `429 Too Many Requests`

**响应示例：**

```json
{
  "accepted": 1,
  "rejected": 0
}
```

---

### 查询事件

```http
GET /api/analytics/events?app_id=project_xxx&event_type=screen_view&from=2024-06-01&to=2024-06-25&limit=50
```

**认证：** 需要有效的 `ANALYTICS_API_KEY`（管理员 Key）

**查询参数：**

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|:----:|:----:|:----:|------|
| `app_id` | string | 是 | — | 应用 ID |
| `event_type` | string | 否 | — | 事件类型筛选 |
| `from` | string | 否 | — | 起始时间（ISO 格式） |
| `to` | string | 否 | — | 结束时间（ISO 格式） |
| `limit` | integer | 否 | 100 | 返回条数上限 |

**响应示例：**

```json
{
  "app_id": "project_xxx",
  "period": {
    "from": "2024-06-01T00:00:00Z",
    "to": "2024-06-25T23:59:59Z"
  },
  "totalCount": 1520,
  "samples": [
    {
      "app_id": "project_xxx",
      "event_type": "screen_view",
      "event_name": "home_page",
      "user_id": "user_xxx",
      "timestamp": "2024-06-25T10:00:00Z"
    }
  ]
}
```

---

## 仪表盘数据

```http
GET /api/analytics/dashboard?app_id=project_xxx&period=30d
```

返回综合数据分析报告，包括活跃用户、页面访问排行和错误率。

**认证：** 需要有效的 `ANALYTICS_API_KEY`（管理员 Key）

**查询参数：**

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|:----:|:----:|:----:|------|
| `app_id` | string | 是 | — | 应用 ID |
| `period` | string | 否 | `30d` | 时间范围（`7d` / `30d` / `90d`） |

**响应示例：**

```json
{
  "app_id": "project_xxx",
  "period": "30d",
  "totalScreens": 12,
  "totalEvents": 45820,
  "activeUsers": 342,
  "dailyActiveUsers": [
    { "date": "2024-06-25", "users": 128 },
    { "date": "2024-06-24", "users": 145 }
  ],
  "topScreens": [
    { "screen": "首页", "views": 12500, "percentage": 27.3 },
    { "screen": "商品列表", "views": 8900, "percentage": 19.4 },
    { "screen": "商品详情", "views": 6700, "percentage": 14.6 }
  ],
  "topEvents": [
    { "event": "add_to_cart", "count": 3400 },
    { "event": "search", "count": 2800 }
  ],
  "errorRate": 0.023,
  "retentionEstimate": 0.42
}
```

**指标说明：**

| 指标 | 说明 |
|------|------|
| `totalScreens` | 不同页面类型数量 |
| `totalEvents` | 事件总数 |
| `activeUsers` | 活跃用户数（去重） |
| `dailyActiveUsers` | 每日活跃用户趋势 |
| `topScreens` | Top 10 页面访问排行 |
| `topEvents` | Top 10 自定义事件排行 |
| `errorRate` | 错误事件占总事件的比率 |
| `retentionEstimate` | 次日留存率估算（有会话的用户 / 总活跃用户） |

---

## SDK 用法

### Flutter SDK

从生成的 Flutter 项目中集成：

```dart
import 'package:your_app/analytics.dart';

// 初始化
final analytics = AnalyticsService(
  apiKey: 'your_analytics_key',
  appId: 'project_xxx',
);

// 页面浏览
analytics.trackScreenView('home_page', '首页');

// 自定义事件
analytics.trackEvent('add_to_cart', {
  'product_id': 'prod_123',
  'price': 29.99,
});

// 记录错误
analytics.trackError('网络请求失败', {
  'url': '/api/products',
  'status_code': 500,
});
```

### JavaScript SDK

```javascript
import { AnalyticsClient } from './analytics-client';

const analytics = new AnalyticsClient({
  apiKey: 'your_analytics_key',
  appId: 'project_xxx',
});

// 页面浏览
analytics.track('screen_view', {
  screen_name: '首页',
  event_name: 'home_page',
});

// 自定义事件
analytics.track('custom_event', {
  event_name: 'share',
  properties: { platform: 'wechat' },
});
```

---

## 错误码

| 状态码 | 说明 |
|:-----:|------|
| `400` | 参数错误（如事件类型无效、超出事件数限制） |
| `401` | API Key 无效或缺失 |
| `429` | 超出速率限制（1000 事件/分钟/app_id） |

---

## 完整示例

```bash
# 记录页面浏览事件
curl -X POST https://your-app.com/api/analytics/events \
  -H "Content-Type: application/json" \
  -H "x-analytics-key: project_xxx" \
  -d '{
    "events": [{
      "app_id": "project_xxx",
      "event_type": "screen_view",
      "event_name": "home_page",
      "screen_name": "首页"
    }]
  }'

# 查询事件（需要管理员 Key）
curl "https://your-app.com/api/analytics/events?app_id=project_xxx&event_type=screen_view&from=2024-06-01&limit=10" \
  -H "x-analytics-key: <ADMIN_API_KEY>"

# 获取仪表盘
curl "https://your-app.com/api/analytics/dashboard?app_id=project_xxx&period=7d" \
  -H "x-analytics-key: <ADMIN_API_KEY>"
```
