# Experiments API (A/B 测试)

Experiments API 提供完整的 A/B 测试功能，包括实验创建、用户分配、事件跟踪和结果分析。

## 数据结构

```typescript
type Experiment = {
  id: string;                        // UUID
  name: string;                      // 实验名称
  description?: string;              // 描述
  status: "draft" | "running" | "paused" | "completed";  // 状态
  variants: string[];                // 变体名称列表（至少 2 个）
  trafficAllocation?: number;        // 流量分配比例（0-100）
  startAt?: string;                  // 开始时间
  endAt?: string;                    // 结束时间
  createdBy: string;                 // 创建者用户 ID
  createdAt: string;                 // ISO 时间戳
  updatedAt: string;                 // ISO 时间戳
};

type ExperimentResults = {
  totalUsers: number;                // 参与用户总数
  variantResults: Array<{
    variant: string;                 // 变体名称
    userCount: number;               // 分配到该变体的用户数
    eventCount: number;              // 转换事件数
    conversionRate: number;          // 转换率
  }>;
  winner?: string;                   // 胜出的变体（如果有统计显著性）
};
```

---

## 创建实验

```http
POST /api/experiments
Content-Type: application/json

{
  "name": "首页布局 A/B 测试",
  "description": "测试两种首页卡片布局的点击率差异",
  "variants": ["控制组-列表布局", "实验组-网格布局"],
  "trafficAllocation": 50,
  "startAt": "2024-07-01T00:00:00Z",
  "endAt": "2024-07-14T23:59:59Z"
}
```

**认证：** 启用认证时需要已登录用户

**参数说明：**

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|:----:|:----:|:----:|------|
| `name` | string | 是 | — | 实验名称 |
| `description` | string | 否 | — | 描述 |
| `variants` | string[] | 是 | — | 变体列表（至少 2 个，不能有空字符串，不能重复） |
| `trafficAllocation` | integer | 否 | 100 | 参与实验的流量百分比（1-100） |
| `startAt` | string | 否 | 立即 | 开始时间（ISO 格式） |
| `endAt` | string | 否 | — | 结束时间（ISO 格式） |

**响应（201 Created）：**

```json
{
  "experiment": {
    "id": "exp_abc123",
    "name": "首页布局 A/B 测试",
    "description": "测试两种首页卡片布局的点击率差异",
    "status": "draft",
    "variants": ["控制组-列表布局", "实验组-网格布局"],
    "trafficAllocation": 50,
    "startAt": "2024-07-01T00:00:00Z",
    "endAt": "2024-07-14T23:59:59Z",
    "createdBy": "user_xxx",
    "createdAt": "2024-06-25T10:00:00Z",
    "updatedAt": "2024-06-25T10:00:00Z"
  }
}
```

---

## 获取实验列表

```http
GET /api/experiments?status=running
```

**认证：** 启用认证时需要已登录用户

**查询参数：**

| 参数 | 类型 | 说明 |
|------|:----:|------|
| `status` | string | 按状态筛选：`draft` / `running` / `paused` / `completed` |

**响应示例：**

```json
{
  "experiments": [
    {
      "id": "exp_abc123",
      "name": "首页布局 A/B 测试",
      "status": "running",
      "variants": ["控制组", "实验组"],
      "createdAt": "2024-06-25T10:00:00Z"
    }
  ]
}
```

---

## 获取实验详情

```http
GET /api/experiments/:id
```

**认证：** 启用认证时需要已登录用户

**响应示例（运行中或已完成时包含结果）：**

```json
{
  "experiment": {
    "id": "exp_abc123",
    "name": "首页布局 A/B 测试",
    "status": "running",
    "variants": ["控制组-列表布局", "实验组-网格布局"],
    "trafficAllocation": 50,
    "startAt": "2024-07-01T00:00:00Z",
    "createdAt": "2024-06-25T10:00:00Z"
  },
  "results": {
    "totalUsers": 1200,
    "variantResults": [
      {
        "variant": "控制组-列表布局",
        "userCount": 602,
        "eventCount": 180,
        "conversionRate": 0.299
      },
      {
        "variant": "实验组-网格布局",
        "userCount": 598,
        "eventCount": 245,
        "conversionRate": 0.410
      }
    ],
    "winner": "实验组-网格布局"
  }
}
```

---

## 更新实验

```http
PUT /api/experiments/:id
Content-Type: application/json

{
  "name": "更新后的实验名称",
  "status": "running"
}
```

**认证：** 启用认证时需要已登录用户

**参数说明：** 至少需要提供一个更新字段

| 参数 | 类型 | 说明 |
|------|:----:|------|
| `name` | string | 实验名称 |
| `description` | string | 描述 |
| `variants` | string[] | 变体列表 |
| `trafficAllocation` | integer | 流量分配 |
| `status` | string | 状态：`draft` / `running` / `paused` / `completed` |
| `startAt` | string | 开始时间 |
| `endAt` | string | 结束时间 |

**响应示例：**

```json
{
  "experiment": {
    "id": "exp_abc123",
    "name": "更新后的实验名称",
    "status": "running",
    "variants": ["控制组-列表布局", "实验组-网格布局"],
    "createdAt": "2024-06-25T10:00:00Z",
    "updatedAt": "2024-06-25T11:00:00Z"
  }
}
```

---

## 分配用户到变体

```http
POST /api/experiments/:id/assign
Content-Type: application/json

{
  "user_id": "user_xxx"
}
```

根据用户 ID 确定性分配该用户到某个变体（同一用户始终分配到同一变体）。

**认证：** 启用认证时需要已登录用户

**参数说明：**

| 参数 | 类型 | 必填 | 说明 |
|------|:----:|:----:|------|
| `user_id` | string | 是 | 用户 ID |

**响应示例：**

```json
{
  "variant": "实验组-网格布局"
}
```

---

## 跟踪转换事件

```http
POST /api/experiments/:id/track
Content-Type: application/json

{
  "user_id": "user_xxx",
  "event_name": "card_click",
  "properties": {
    "card_id": "product_123",
    "position": 3
  }
}
```

记录一个转换事件，用于 A/B 测试分析。

**认证：** 启用认证时需要已登录用户

**参数说明：**

| 参数 | 类型 | 必填 | 说明 |
|------|:----:|:----:|------|
| `user_id` | string | 是 | 用户 ID |
| `event_name` | string | 是 | 事件名称 |
| `properties` | object | 否 | 事件属性 |

**响应示例：**

```json
{
  "success": true
}
```

---

## 实验工作流

### 完整流程

```
1. 创建实验 (POST /experiments) → status: "draft"
2. 分配用户  (POST /experiments/:id/assign) → 返回变体
3. 跟踪事件  (POST /experiments/:id/track) → 记录转换
4. 开始实验  (PUT /experiments/:id) → status: "running"
5. 暂停实验  (POST /experiments/:id/pause) → status: "paused"
6. 完成实验  (POST /experiments/:id/complete) → status: "completed"
7. 查看结果  (GET /experiments/:id) → 包含 results 字段
```

### 前端 SDK 集成

```javascript
// 分配用户到变体
async function assignVariant(experimentId, userId) {
  const res = await fetch(`/api/experiments/${experimentId}/assign`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId }),
  });
  const { variant } = await res.json();
  return variant;
}

// 跟踪转换事件
async function trackEvent(experimentId, userId, eventName, properties) {
  await fetch(`/api/experiments/${experimentId}/track`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId, event_name: eventName, properties }),
  });
}

// 使用示例
const variant = await assignVariant('exp_abc123', 'user_xxx');
if (variant === '实验组-网格布局') {
  // 显示网格布局
  showGridView();
} else {
  // 显示列表布局
  showListView();
}

// 用户点击卡片时跟踪
document.querySelector('.card').addEventListener('click', () => {
  trackEvent('exp_abc123', 'user_xxx', 'card_click', { card_id: 'prod_123' });
});
```

---

## 错误码

| 状态码 | 说明 |
|:-----:|------|
| `400` | 参数错误（如变体不足 2 个、空字符串、重复变体） |
| `401` | 未登录 |
| `404` | 实验不存在 |

---

## 完整示例

```bash
# 创建实验
curl -X POST https://your-app.com/api/experiments \
  -H "Content-Type: application/json" \
  -d '{
    "name": "按钮颜色测试",
    "description": "测试蓝色 vs 绿色按钮的点击率",
    "variants": ["蓝色按钮", "绿色按钮"],
    "trafficAllocation": 100
  }'

# 开始实验
curl -X PUT https://your-app.com/api/experiments/exp_abc123 \
  -H "Content-Type: application/json" \
  -d '{"status": "running"}'

# 分配用户
curl -X POST https://your-app.com/api/experiments/exp_abc123/assign \
  -H "Content-Type: application/json" \
  -d '{"user_id": "user_xxx"}'

# 跟踪事件
curl -X POST https://your-app.com/api/experiments/exp_abc123/track \
  -H "Content-Type: application/json" \
  -d '{"user_id": "user_xxx", "event_name": "button_click"}'

# 查看结果
curl https://your-app.com/api/experiments/exp_abc123
```
