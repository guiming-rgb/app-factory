# Workspaces API

Workspaces 允许你将项目和成员组织到团队工作区中，实现协作开发。

## 数据结构

```typescript
type Workspace = {
  id: string;                        // UUID
  name: string;                      // 工作区名称
  description?: string;              // 描述
  owner_id: string;                  // 创建者用户 ID
  logo_url?: string;                 // Logo URL
  member_count: number;              // 成员数量
  project_count: number;             // 项目数量
  subscription_tier: string;         // 订阅等级
  created_at: string;                // ISO 时间戳
  updated_at: string;                // ISO 时间戳
};

type WorkspaceMember = {
  id: string;                        // UUID
  workspace_id: string;              // Workspace ID
  user_id: string;                   // 用户 ID
  role: "admin" | "editor" | "viewer"; // 角色
  joined_at: string;                 // ISO 时间戳
};
```

---

## 获取 Workspace 列表

```http
GET /api/workspaces
```

按创建时间降序返回当前用户的所有 Workspace。

**认证：** 启用认证时需要已登录用户

**响应示例：**

```json
{
  "workspaces": [
    {
      "id": "ws_abc123",
      "name": "我的团队",
      "description": "团队项目工作区",
      "owner_id": "user_xxx",
      "logo_url": null,
      "member_count": 3,
      "project_count": 12,
      "subscription_tier": "pro",
      "created_at": "2024-01-15T08:00:00Z",
      "updated_at": "2024-06-20T10:30:00Z"
    }
  ]
}
```

---

## 创建 Workspace

```http
POST /api/workspaces
Content-Type: application/json

{
  "name": "我的团队",
  "description": "团队项目工作区"
}
```

**认证：** 启用认证时需要已登录用户

**参数说明：**

| 参数 | 类型 | 必填 | 说明 |
|------|:----:|:----:|------|
| `name` | string | 是 | Workspace 名称 |
| `description` | string | 否 | 描述信息 |

**响应（201 Created）：**

```json
{
  "workspace": {
    "id": "ws_abc123",
    "name": "我的团队",
    "description": "团队项目工作区",
    "owner_id": "user_xxx",
    "logo_url": null,
    "member_count": 1,
    "project_count": 0,
    "subscription_tier": "free",
    "created_at": "2024-06-25T10:00:00Z",
    "updated_at": "2024-06-25T10:00:00Z"
  }
}
```

---

## 获取 Workspace 详情

```http
GET /api/workspaces/:id
```

**认证：** 需要已登录用户（启用认证时）

**响应示例：**

```json
{
  "workspace": {
    "id": "ws_abc123",
    "name": "我的团队",
    "description": "团队项目工作区",
    "owner_id": "user_xxx",
    "logo_url": null,
    "member_count": 3,
    "project_count": 12,
    "subscription_tier": "pro",
    "created_at": "2024-01-15T08:00:00Z",
    "updated_at": "2024-06-20T10:30:00Z"
  },
  "members": [
    {
      "id": "member_1",
      "workspace_id": "ws_abc123",
      "user_id": "user_xxx",
      "role": "admin",
      "joined_at": "2024-01-15T08:00:00Z"
    },
    {
      "id": "member_2",
      "workspace_id": "ws_abc123",
      "user_id": "user_yyy",
      "role": "editor",
      "joined_at": "2024-02-01T09:00:00Z"
    }
  ]
}
```

---

## 更新 Workspace

```http
PUT /api/workspaces/:id
Content-Type: application/json

{
  "name": "更新后的名称",
  "description": "更新后的描述",
  "logo_url": "https://example.com/logo.png"
}
```

**认证：** 需要 `workspace:update` 权限（owner / admin）

**参数说明：** 至少需要提供一个更新字段

| 参数 | 类型 | 说明 |
|------|:----:|------|
| `name` | string | 名称（最长 128 字符） |
| `description` | string | 描述 |
| `logo_url` | string | Logo URL |

**响应示例：**

```json
{
  "workspace": {
    "id": "ws_abc123",
    "name": "更新后的名称",
    "description": "更新后的描述",
    "owner_id": "user_xxx",
    "logo_url": "https://example.com/logo.png",
    "member_count": 3,
    "project_count": 12,
    "subscription_tier": "pro",
    "created_at": "2024-01-15T08:00:00Z",
    "updated_at": "2024-06-25T11:00:00Z"
  }
}
```

---

## 删除 Workspace

```http
DELETE /api/workspaces/:id
```

级联删除 Workspace 及其所有关联的项目和成员。

**认证：** 需要 `workspace:delete` 权限（仅 owner）

**响应示例：**

```json
{
  "ok": true
}
```

---

## 获取成员列表

```http
GET /api/workspaces/:id/members
```

**认证：** 需要已登录用户

**响应示例：**

```json
{
  "members": [
    {
      "id": "member_1",
      "workspace_id": "ws_abc123",
      "user_id": "user_xxx",
      "role": "admin",
      "joined_at": "2024-01-15T08:00:00Z"
    }
  ]
}
```

---

## 添加成员

```http
POST /api/workspaces/:id/members
Content-Type: application/json

{
  "userId": "user_yyy",
  "role": "editor"
}
```

**认证：** 需要 `member:add` 权限（owner / admin）

**参数说明：**

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|:----:|:----:|:----:|------|
| `userId` | string | 是 | — | 用户 ID |
| `role` | string | 否 | `"editor"` | 角色：`admin` / `editor` / `viewer` |

**响应（201 Created）：**

```json
{
  "ok": true
}
```

---

## 移除成员

```http
DELETE /api/workspaces/:id/members?userId=user_yyy
```

**认证：** 需要 `member:remove` 权限。不能移除自己。

**参数说明：**

| 参数 | 类型 | 必填 | 说明 |
|------|:----:|:----:|------|
| `userId` | string | 是 | Query 参数 |

**响应示例：**

```json
{
  "ok": true
}
```

---

## 角色与权限

| 角色 | 管理项目 | 管理成员 | 管理 Workspace | 删除 Workspace |
|:----:|:-------:|:--------:|:------------:|:------------:|
| admin | ✓ | ✓ | ✓ | ✓ |
| editor | ✓ | ✗ | ✗ | ✗ |
| viewer | 仅查看 | ✗ | ✗ | ✗ |

---

## 错误码

| 状态码 | 说明 |
|:-----:|------|
| `400` | 参数错误（如名称为空、角色无效） |
| `401` | 未登录或 Token 无效 |
| `403` | 无操作权限 |
| `404` | Workspace 或用户不存在 |

---

## 完整示例

```bash
# 创建 Workspace
curl -X POST https://your-app.com/api/workspaces \
  -H "Content-Type: application/json" \
  -d '{"name": "移动开发组", "description": "App 开发团队"}'

# 获取 Workspace ID 后，添加成员
curl -X POST https://your-app.com/api/workspaces/ws_abc123/members \
  -H "Content-Type: application/json" \
  -d '{"userId": "user_yyy", "role": "editor"}'

# 列出成员
curl https://your-app.com/api/workspaces/ws_abc123/members

# 删除 Workspace
curl -X DELETE https://your-app.com/api/workspaces/ws_abc123
```
