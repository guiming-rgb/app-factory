# Billing API

计费 API 提供方案查询、用量跟踪和订阅管理功能。底层使用 Stripe 处理支付。

## 数据结构

```typescript
type PricingPlan = {
  id: "free" | "pro" | "enterprise";
  name: string;                      // 方案名称
  price: number;                     // 月价格（分）
  priceYearly: number;               // 年价格（分）
  currency: string;                  // 货币单位
  description: string;               // 描述
  features: string[];                // 功能列表
  limits: {
    projects: number;                // 最大项目数
    codegenPerMonth: number;         // 月最大生成次数
    members: number;                 // 最大成员数
    storageMB: number;               // 存储空间（MB）
  };
};

type UsageReport = {
  workspaceId: string;
  month: string;                     // YYYY-MM
  codegenCount: number;              // 本月代码生成次数
  storageBytes: number;              // 存储使用量（字节）
  memberCount: number;               // 成员数
  limits: {
    codegenPerMonth: number;         // 月限制
    storageMB: number;               // 存储限制
    members: number;                 // 成员限制
  };
  planId: string;                    // 当前方案 ID
  tier: string;                      // 方案等级
};
```

---

## 获取定价方案

```http
GET /api/billing/plans
```

返回所有可用的定价方案。

**认证：** 公开端点（无需认证）

**响应示例：**

```json
{
  "plans": [
    {
      "id": "free",
      "name": "Free",
      "price": 0,
      "priceYearly": 0,
      "currency": "CNY",
      "currencySymbol": "¥",
      "description": "适合个人开发者探索和试用",
      "features": [
        "3 个活跃项目",
        "每月 10 次代码生成",
        "1 个目标平台",
        "5 个行业模板",
        "5 个 Spec 版本",
        "标准 AI 流水线"
      ],
      "limits": {
        "projects": 3,
        "codegenPerMonth": 10,
        "members": 1,
        "storageMB": 100
      }
    },
    {
      "id": "pro",
      "name": "Pro",
      "price": 29900,
      "priceYearly": 287000,
      "currency": "CNY",
      "currencySymbol": "¥",
      "description": "适合独立开发者和小型团队",
      "features": [
        "50 个活跃项目",
        "每月 200 次代码生成",
        "三平台同时生成",
        "全部 20 个行业模板",
        "优先 AI 流水线",
        "GitHub 推送 + 桌面构建",
        "50 个 Spec 版本",
        "最多 5 名团队成员"
      ],
      "limits": {
        "projects": 50,
        "codegenPerMonth": 200,
        "members": 5,
        "storageMB": 1024
      }
    },
    {
      "id": "enterprise",
      "name": "Enterprise",
      "price": 0,
      "priceYearly": 0,
      "currency": "CNY",
      "currencySymbol": "¥",
      "description": "适合企业级团队，联系我们获取定制报价",
      "features": [
        "不限项目数",
        "不限代码生成次数",
        "定制模板",
        "私有部署",
        "SSO 集成",
        "99.9% SLA",
        "专属客服",
        "完整审计日志"
      ],
      "limits": {
        "projects": -1,
        "codegenPerMonth": -1,
        "members": -1,
        "storageMB": -1
      }
    }
  ]
}
```

---

## 查看用量

```http
GET /api/billing/usage?workspaceId=ws_abc123&month=2024-06
```

获取指定 Workspace 在当前计费周期的用量和限制信息。

**查询参数：**

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|:----:|:----:|:----:|------|
| `workspaceId` | string | 是 | — | Workspace ID |
| `month` | string | 否 | 当前月 | 月份（格式 `YYYY-MM`） |

**响应示例：**

```json
{
  "workspaceId": "ws_abc123",
  "month": "2024-06",
  "codegenCount": 15,
  "storageBytes": 52428800,
  "memberCount": 3,
  "limits": {
    "codegenPerMonth": 200,
    "storageMB": 1024,
    "members": 5
  },
  "planId": "pro",
  "tier": "pro"
}
```

---

## 记录用量

```http
POST /api/billing/usage
Content-Type: application/json

{
  "workspaceId": "ws_abc123",
  "metric": "codegen",
  "amount": 1
}
```

记录一次用量消耗。

**参数说明：**

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|:----:|:----:|:----:|------|
| `workspaceId` | string | 是 | — | Workspace ID |
| `metric` | string | 是 | — | 指标类型：`codegen` / `storage` / `members` |
| `amount` | integer | 否 | 1 | 消耗数量 |

**响应示例：**

```json
{
  "received": true
}
```

---

## 创建订阅

```http
POST /api/billing/subscribe
Content-Type: application/json

{
  "planId": "pro",
  "workspaceId": "ws_abc123",
  "interval": "monthly",
  "successUrl": "https://your-app.com/billing/success",
  "cancelUrl": "https://your-app.com/billing/cancel"
}
```

创建或升级订阅方案。付费方案会重定向到 Stripe Checkout 页面完成支付。

**参数说明：**

| 参数 | 类型 | 必填 | 说明 |
|------|:----:|:----:|------|
| `planId` | string | 是 | 方案 ID：`free` / `pro` / `enterprise` |
| `workspaceId` | string | 是 | Workspace ID |
| `interval` | string | 否 | 周期：`monthly` / `yearly`（默认 `monthly`） |
| `successUrl` | string | 否 | 支付成功后的跳转 URL |
| `cancelUrl` | string | 否 | 取消支付后的跳转 URL |

**响应示例：**

```json
{
  "checkoutUrl": "https://checkout.stripe.com/c/pay_xxx",
  "subscriptionId": "sub_abc123"
}
```

免费方案直接返回空的 `checkoutUrl`。

---

## Webhook

Stripe 支付事件通过 Webhook 处理：

```http
POST /api/stripe/webhook
```

处理的事件类型：

- `checkout.session.completed` — 支付完成
- `customer.subscription.updated` — 订阅更新
- `customer.subscription.deleted` — 订阅取消/删除
- `invoice.payment_succeeded` — 账单支付成功
- `invoice.payment_failed` — 账单支付失败

---

## 方案限制速查

| 限制项 | Free | Pro | Enterprise |
|:------|:----:|:---:|:----------:|
| 项目数 | 3 | 50 | 不限 |
| 月代码生成次数 | 10 | 200 | 不限 |
| 成员数 | 1 | 5 | 不限 |
| 存储空间 | 100 MB | 1 GB | 不限 |

---

## 错误码

| 状态码 | 说明 |
|:-----:|------|
| `400` | 方案 ID 无效、周期无效 |
| `403` | 无权限查看该 Workspace 的用量 |

---

## 完整示例

```bash
# 查看方案
curl https://your-app.com/api/billing/plans

# 查看用量
curl "https://your-app.com/api/billing/usage?workspaceId=ws_abc123&month=2024-06"

# 升级到 Pro 方案（月付）
curl -X POST https://your-app.com/api/billing/subscribe \
  -H "Content-Type: application/json" \
  -d '{
    "planId": "pro",
    "workspaceId": "ws_abc123",
    "interval": "monthly",
    "successUrl": "https://your-app.com/billing/success",
    "cancelUrl": "https://your-app.com/billing/cancel"
  }'
```
