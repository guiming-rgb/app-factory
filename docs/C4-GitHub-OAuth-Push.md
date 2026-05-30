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

1. [GitHub OAuth App](https://github.com/settings/developers) → **New OAuth App**  
   - Application name：`App 生产工厂`（任意）  
   - Homepage：`NEXT_PUBLIC_APP_URL`（本地 `http://localhost:3001`）  
   - Callback：`{APP_URL}/api/github/oauth/callback`
2. `.env.local`：
   ```bash
   GITHUB_OAUTH_CLIENT_ID=...
   GITHUB_OAUTH_CLIENT_SECRET=...
   # 可选
   GITHUB_OAUTH_SCOPES=repo read:user
   GITHUB_OAUTH_STATE_SECRET=随机字符串
   ```
3. 检查环境：
   ```bash
   npm run check:c4:github
   ```
4. Supabase 迁移（无 psql 时脚本会自动用 node `pg`）：
   ```bash
   npm run db:apply:c4-github
   ```
5. 重启 `npm run dev` 或 `npm run start -- -p 3001`，登录后项目详情 →「连接 GitHub」

**生产（Vercel）**：OAuth App 再建一条 Callback 指向 `https://app-factory-five.vercel.app/api/github/oauth/callback`，或同一 App 允许多 callback（GitHub 仅一条 — 生产/本地需各建 App 或开发时用生产 URL 测）。同步密钥：

```bash
npm run deploy:vercel:env   # 已含 GITHUB_OAUTH_* 键
```

## 用户流程

1. 登录 → 项目详情 →「连接 GitHub」
2. 后台生成 Flutter/小程序 ZIP 完成后
3. 点「推 GitHub」→ 自动创建私有仓库并提交解压后的源码

## metadata（codegen_runs）

- `githubPushStatus` · `githubRepoUrl` · `githubCommitSha` · `githubBranch` · `githubFileCount`

## 禁用

- `GITHUB_OAUTH_DISABLED=1` — 隐藏 OAuth / 推送
