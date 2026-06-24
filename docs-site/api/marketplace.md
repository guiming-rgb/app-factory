# Marketplace API

Marketplace 组件市场提供可复用 UI 组件、页面模板和服务的搜索、发布和安装功能。

## 数据结构

```typescript
type MarketplaceComponent = {
  id: string;                        // UUID
  name: string;                      // 组件名称
  version: string;                   // 语义化版本号
  author_id: string;                 // 作者用户 ID
  author_name: string;               // 作者名称
  industry: string;                  // 所属行业分类
  type: "widget" | "page" | "service" | "template";  // 组件类型
  description?: string;              // 组件描述
  tags?: string[];                   // 标签
  approved: boolean;                 // 是否审核通过
  download_count: number;            // 下载/安装次数
  files?: Record<string, string>;    // 组件文件
  preview_image?: string;            // 预览图 URL
  created_at: string;                // ISO 时间戳
  updated_at: string;                // ISO 时间戳
};
```

---

## 搜索组件

```http
GET /api/marketplace/components?industry=ecommerce&type=widget&search=搜索&page=1&limit=20
```

返回已审核通过的组件列表，支持多维度筛选。

**认证：** 公开（无需认证）

**查询参数：**

| 参数 | 类型 | 默认值 | 说明 |
|------|:----:|:----:|------|
| `industry` | string | — | 按行业筛选（如 `ecommerce`、`social`） |
| `type` | string | — | 按类型筛选（`widget` / `page` / `service` / `template`） |
| `search` | string | — | 全文搜索关键词 |
| `page` | integer | 1 | 页码 |
| `limit` | integer | 20 | 每页条数（最大 100） |

**响应示例：**

```json
{
  "components": [
    {
      "id": "comp_abc123",
      "name": "商品卡片组件",
      "version": "1.0.0",
      "author_id": "user_xxx",
      "author_name": "开发者A",
      "industry": "ecommerce",
      "type": "widget",
      "description": "美观的商品展示卡片，支持图片、价格、评分、标签",
      "tags": ["商品", "卡片", "电商"],
      "approved": true,
      "download_count": 256,
      "preview_image": "https://cdn.example.com/previews/card.png",
      "created_at": "2024-03-10T08:00:00Z",
      "updated_at": "2024-06-20T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 42,
    "totalPages": 3
  }
}
```

---

## 提交组件

```http
POST /api/marketplace/components
Content-Type: application/json

{
  "name": "商品卡片组件",
  "version": "1.0.0",
  "industry": "ecommerce",
  "type": "widget",
  "description": "美观的商品展示卡片",
  "tags": ["商品", "卡片"],
  "files": {
    "main.dart": "content...",
    "styles.dart": "content..."
  },
  "previewImage": "https://example.com/preview.png"
}
```

**认证：** 需要已登录用户

**参数说明：**

| 参数 | 类型 | 必填 | 说明 |
|------|:----:|:----:|------|
| `name` | string | 是 | 组件名称 |
| `version` | string | 否 | 版本号（默认 `"1.0.0"`） |
| `industry` | string | 是 | 所属行业 ID |
| `type` | string | 是 | 组件类型（`widget` / `page` / `service` / `template`） |
| `description` | string | 否 | 描述信息 |
| `tags` | string[] | 否 | 标签列表 |
| `files` | object | 否 | 组件文件内容 |
| `previewImage` | string | 否 | 预览图 URL |

**响应（201 Created）：**

```json
{
  "id": "comp_abc123"
}
```

---

## 获取组件详情

```http
GET /api/marketplace/components/:id
```

**认证：** 公开（无需认证）

**响应示例：**

```json
{
  "id": "comp_abc123",
  "name": "商品卡片组件",
  "version": "1.0.0",
  "author_id": "user_xxx",
  "author_name": "开发者A",
  "industry": "ecommerce",
  "type": "widget",
  "description": "美观的商品展示卡片，支持图片、价格、评分、标签",
  "tags": ["商品", "卡片", "电商"],
  "approved": true,
  "download_count": 256,
  "files": {
    "main.dart": "...",
    "styles.dart": "..."
  },
  "preview_image": "https://cdn.example.com/previews/card.png",
  "created_at": "2024-03-10T08:00:00Z",
  "updated_at": "2024-06-20T10:30:00Z"
}
```

---

## 安装组件

```http
POST /api/marketplace/components/:id/install
```

将组件安装到当前用户的项目中。组件文件会自动合并到目标项目的 Spec 中。

**认证：** 需要已登录用户

**响应示例：**

```json
{
  "ok": true,
  "message": "组件已安装"
}
```

---

## 错误码

| 状态码 | 说明 |
|:-----:|------|
| `400` | 参数错误（如缺少必填字段、类型无效） |
| `401` | 未登录 |
| `404` | 组件不存在 |

---

## 完整示例

```bash
# 搜索电商类 widget 组件
curl "https://your-app.com/api/marketplace/components?industry=ecommerce&type=widget&limit=10"

# 提交新组件
curl -X POST https://your-app.com/api/marketplace/components \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "name": "搜索栏组件",
    "industry": "ecommerce",
    "type": "widget",
    "description": "带历史记录和自动补全的搜索栏",
    "tags": ["搜索", "导航"]
  }'

# 查看组件详情
curl https://your-app.com/api/marketplace/components/comp_abc123
```
