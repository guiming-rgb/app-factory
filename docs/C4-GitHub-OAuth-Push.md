# C4 — GitHub OAuth + 产物 Push

> **状态**：✅（2026-05-22）· 验收 `npm run verify:c4:github`

## 能力

| 项 | 说明 |
|----|------|
| OAuth | `/api/github/oauth/start` → GitHub → `/api/github/oauth/callback` |
| 连接状态 | `GET /api/github/status` · UI「连接 GitHub」 |
| 断开 | `POST /api/github/disconnect` |
| 推送 | `POST /api/projects/[id]/codegen/runs/[runId]/github-push` |
| 存储 | `user_github_connections`（token 仅 service_role 读写） |
| UI | 项目详情 CodegenPanel ·「推 GitHub」/ 仓库链接 |

## 维护者配置（一次性）

1. [GitHub OAuth App](https://github.com/settings/developers)  
   - Homepage：`NEXT_PUBLIC_APP_URL`  
   - Callback：`{APP_URL}/api/github/oauth/callback`
2. `.env.local`：
   ```bash
   GITHUB_OAUTH_CLIENT_ID=...
   GITHUB_OAUTH_CLIENT_SECRET=...
   ```
3. Supabase 迁移：
   ```bash
   npm run db:apply:c4-github
   ```

## 用户流程

1. 登录 → 项目详情 →「连接 GitHub」
2. 后台生成 Flutter/小程序 ZIP 完成后
3. 点「推 GitHub」→ 自动创建私有仓库并提交解压后的源码

## metadata（codegen_runs）

- `githubPushStatus` · `githubRepoUrl` · `githubCommitSha` · `githubBranch` · `githubFileCount`

## 禁用

- `GITHUB_OAUTH_DISABLED=1` — 隐藏 OAuth / 推送
