# API 参考

App 生产工厂提供 REST API，让你可以以编程方式管理项目、生成代码、配置 Workspace 和跟踪分析数据。

**基准 URL：** `https://your-app.com/api`

---

## 认证

### Supabase JWT

大部分 API 使用 Supabase 的认证机制。通过 `getApiUser()` 函数检查用户身份：

```http
# 浏览器端会自动处理（HttpOnly Cookie）
# 手动调用时需要 Bearer Token
Authorization: Bearer <supabase_jwt_token>
```

当认证被禁用时（开发环境），系统使用匿名用户 `"__no_auth__"` 运行。

### API Key 认证

某些端点（如 Analytics）使用自定义 API Key 认证：

```http
x-analytics-key: <analytics_api_key>
```

---

## 速率限制

生成 (`/generate`) 和代码生成 (`/codegen`) 端点实施了速率限制：

| 操作 | 限制 | 响应 |
|------|:----:|:----:|
| 项目生成 (`generate`) | 按用户限制 | `429 Too Many Requests` |
| 代码生成 (`codegen`) | 按用户限制 | `429 Too Many Requests` |
| Analytics 事件 | 1000 事件/分钟/应用 | `429 Too Many Requests` |
| 项目创建 | 按配额限制 | `400 Quota Exceeded` |

---

## 错误码

| HTTP 状态码 | 说明 | 典型原因 |
|:----------:|------|---------|
| `200` | 成功 | 请求正常处理 |
| `201` | 创建成功 | 资源创建成功 |
| `400` | 请求错误 | 参数验证失败、配额不足 |
| `401` | 未认证 | 缺少有效 Token |
| `403` | 无权限 | 非项目所有者/成员 |
| `404` | 资源不存在 | 项目/运行/用户不存在 |
| `409` | 冲突 | 工作流正在运行 |
| `429` | 速率限制 | 超出调用频率限制 |
| `500` | 服务器错误 | 内部处理异常 |

错误响应格式：

```json
{
  "error": "错误描述信息"
}
```

---

## 分页

列表类端点支持分页参数：

| 参数 | 类型 | 默认值 | 说明 |
|------|:----:|:----:|------|
| `page` | integer | 1 | 页码 |
| `limit` | integer | 20 | 每页条数（最大 100） |

分页响应格式：

```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

---

## 端点总览

### 项目管理

| 方法 | 路径 | 说明 |
|:----:|------|------|
| GET | `/api/projects` | 获取项目列表 |
| POST | `/api/projects` | 创建新项目 |
| GET | `/api/projects/:id` | 获取项目详情 |
| POST | `/api/projects/:id/generate` | 触发 AI 流水线 |
| GET | `/api/projects/:id/spec` | 获取 App Spec |
| PUT | `/api/projects/:id/spec` | 更新 App Spec |
| DELETE | `/api/projects/:id/spec` | 重置 App Spec |
| POST | `/api/projects/:id/clone` | 克隆项目 |
| POST | `/api/projects/:id/feedback` | 提交反馈 |

### 代码生成

| 方法 | 路径 | 说明 |
|:----:|------|------|
| GET | `/api/projects/:id/codegen/runs` | 获取生成记录列表 |
| GET | `/api/projects/:id/codegen/runs/:runId` | 获取生成记录详情 |
| POST | `/api/projects/:id/codegen/flutter` | 生成 Flutter 代码 |
| POST | `/api/projects/:id/codegen/wechat` | 生成微信小程序 |
| POST | `/api/projects/:id/codegen/harmony` | 生成鸿蒙代码 |
| POST | `/api/projects/:id/codegen/generate-all` | 生成所有平台 |
| POST | `/api/projects/:id/codegen/runs/:runId/cancel` | 取消生成任务 |
| GET | `/api/projects/:id/codegen/runs/:runId/download` | 下载生成产物 |
| GET | `/api/projects/:id/codegen/runs/:runId/preview` | 预览 HTML |
| GET | `/api/projects/:id/codegen/runs/:runId/sql` | 获取 DDL SQL |

### Spec 版本管理

| 方法 | 路径 | 说明 |
|:----:|------|------|
| GET | `/api/projects/:id/spec/versions` | 获取版本列表 |
| GET | `/api/projects/:id/versions/:versionId` | 获取版本详情 |
| GET | `/api/projects/:id/versions` | 获取所有版本 |
| GET | `/api/projects/:id/versions/diff` | 版本差异对比 |

### 模板

| 方法 | 路径 | 说明 |
|:----:|------|------|
| GET | `/api/templates` | 获取模板列表 |
| POST | `/api/templates` | 从模板创建项目 |

### Workspaces

| 方法 | 路径 | 说明 |
|:----:|------|------|
| GET | `/api/workspaces` | 获取 Workspace 列表 |
| POST | `/api/workspaces` | 创建 Workspace |
| GET | `/api/workspaces/:id` | 获取 Workspace 详情 |
| PUT | `/api/workspaces/:id` | 更新 Workspace |
| DELETE | `/api/workspaces/:id` | 删除 Workspace |
| GET | `/api/workspaces/:id/members` | 获取成员列表 |
| POST | `/api/workspaces/:id/members` | 添加成员 |
| DELETE | `/api/workspaces/:id/members` | 移除成员 |
| GET | `/api/workspaces/:id/invites` | 邀请管理 |

### 计费

| 方法 | 路径 | 说明 |
|:----:|------|------|
| GET | `/api/billing/plans` | 获取定价方案 |
| GET | `/api/billing/usage` | 获取用量信息 |
| POST | `/api/billing/subscribe` | 订阅方案 |

### 分析

| 方法 | 路径 | 说明 |
|:----:|------|------|
| POST | `/api/analytics/events` | 记录分析事件 |
| GET | `/api/analytics/events` | 查询事件 |
| GET | `/api/analytics/dashboard` | 获取仪表盘数据 |

### A/B 实验

| 方法 | 路径 | 说明 |
|:----:|------|------|
| GET | `/api/experiments` | 获取实验列表 |
| POST | `/api/experiments` | 创建实验 |
| GET | `/api/experiments/:id` | 获取实验详情 |
| PUT | `/api/experiments/:id` | 更新实验 |
| POST | `/api/experiments/:id/assign` | 分配用户到变体 |
| POST | `/api/experiments/:id/track` | 跟踪转换事件 |
| POST | `/api/experiments/:id/pause` | 暂停实验 |
| POST | `/api/experiments/:id/complete` | 完成实验 |

### 市场

| 方法 | 路径 | 说明 |
|:----:|------|------|
| GET | `/api/marketplace/components` | 搜索组件 |
| POST | `/api/marketplace/components` | 提交组件 |
| GET | `/api/marketplace/components/:id` | 获取组件详情 |
| POST | `/api/marketplace/components/:id/install` | 安装组件 |

### 用户

| 方法 | 路径 | 说明 |
|:----:|------|------|
| GET | `/api/user/profile` | 获取用户资料 |
| PUT | `/api/user/profile` | 更新用户资料 |
| POST | `/api/user/delete` | 删除账号 |

### 系统

| 方法 | 路径 | 说明 |
|:----:|------|------|
| GET | `/api/health` | 健康检查 |
| GET | `/api/admin` | 管理后台 |
| GET | `/api/security/audit-log` | 审计日志 |
| GET | `/api/data-export` | 数据导出 |
| GET | `/api/dashboard` | 全局仪表盘 |

### GitHub 集成

| 方法 | 路径 | 说明 |
|:----:|------|------|
| GET | `/api/github/status` | GitHub 连接状态 |
| GET | `/api/github/oauth/start` | OAuth 授权开始 |
| GET | `/api/github/oauth/callback` | OAuth 回调处理 |
| POST | `/api/github/disconnect` | 断开 GitHub 连接 |
| POST | `/api/projects/:id/codegen/github-push-all` | 推送代码到 GitHub |

---

## 开始使用

以下是快速上手的示例流程：

```bash
# 1. 创建项目
curl -X POST https://your-app.com/api/projects \
  -H "Content-Type: application/json" \
  -d '{"idea": "一个校园二手交易平台"}'

# 2. 获取项目 ID（从返回中提取）
# PROJECT_ID=xxx

# 3. 查看可用模板
curl https://your-app.com/api/templates

# 4. 获取 Spec
curl https://your-app.com/api/projects/$PROJECT_ID/spec

# 5. 生成 Flutter 代码
curl -X POST https://your-app.com/api/projects/$PROJECT_ID/codegen/flutter

# 6. 查看生成记录
curl https://your-app.com/api/projects/$PROJECT_ID/codegen/runs

# 7. 下载生成的代码
# 从 /codegen/runs 返回的 URL 中获取下载链接
```

---

## 端到端示例

以下是一个使用 API 完成从创建项目到生成代码的完整脚本：

```bash
#!/bin/bash
# 配置
BASE_URL="https://your-app.com/api"
IDEA="一个面向大学生的二手交易平台"

# 1. 创建项目
echo "=== 创建项目 ==="
RESPONSE=$(curl -s -X POST "$BASE_URL/projects" \
  -H "Content-Type: application/json" \
  -d "{\"idea\": \"$IDEA\"}")
PROJECT_ID=$(echo $RESPONSE | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "Project ID: $PROJECT_ID"

# 2. 触发 AI 流水线
echo "=== 触发 AI 流水线 ==="
curl -s -X POST "$BASE_URL/projects/$PROJECT_ID/generate" \
  -H "Content-Type: application/json" \
  -d '{}'

# 3. 等待流水线完成（轮询项目状态）
echo "=== 等待流水线完成 ==="
while true; do
  STATUS=$(curl -s "$BASE_URL/projects/$PROJECT_ID" | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
  echo "Status: $STATUS"
  if [ "$STATUS" = "completed" ]; then
    break
  fi
  sleep 5
done

# 4. 获取 Spec
echo "=== 获取 App Spec ==="
curl -s "$BASE_URL/projects/$PROJECT_ID/spec" | head -c 500

# 5. 生成 Flutter 代码
echo "=== 生成 Flutter 代码 ==="
curl -s -X POST "$BASE_URL/projects/$PROJECT_ID/codegen/flutter"

# 6. 获取下载 URL
echo "=== 获取下载链接 ==="
curl -s "$BASE_URL/projects/$PROJECT_ID/codegen/runs" | \
  grep -o '"downloadUrl":"[^"]*"'
```
