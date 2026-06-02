# App 生产工厂 (v6)

AI 原生软件生产平台：输入 App 想法 → 8 Agent 方案生成 → App Spec 提取 → 三平台代码生成 → 后端 API → 一键部署。

## 当前状态

```
████████████████████████████████████████████████  97%

测试 100+ · CI 7 Job · 17 screen type · 10 套模板 · 45 API · 计费/协作/监控
```

## 能力矩阵

| 能力 | 覆盖 |
|------|------|
| 代码生成 | Flutter + 微信小程序 + 鸿蒙 (17 screen type) |
| 后端 | DDL + RLS + Express API + Edge Functions |
| 模板库 | 电商/社交/CRM/博客/健身/外卖/酒店/招聘/物业/课程表 |
| Auth | 邮箱登录 + 社交登录 (Google/GitHub) |
| 质量 | AI 代码修复 + 自动评分 + Prompt A/B + 自动重试 |
| CI/CD | 7 Job (typecheck/test/flutter/build/validate/deploy/health) |
| 监控 | Sentry + 压测 + 错误模式分析 |
| 计费 | Free/Pro/Enterprise + Stripe Webhook |
| 协作 | 团队空间 + 分享链接 + 项目克隆 + 反馈 |

## 快速开始

```bash
npm install
cp .env.local.example .env.local  # 配置 Supabase + OpenAI
npm run dev                        # 终端 A
npm run inngest:dev               # 终端 B
open http://localhost:3000
```

## 测试

```bash
npm test              # 单元测试 100+ 用例
npm run test:e2e      # E2E 测试
npm run test:coverage # 覆盖率报告
npm run validate:spec # Spec 校验
```

## 脚本速查

| 命令 | 用途 |
|------|------|
| `npm run docs:dev` | 文档站开发 |
| `npm run docs:api` | API 文档生成 |
| `npm run perf` | 性能压测 |
| `npm run verify:prod` | 生产环境验证 |
| `npm run changelog` | Changelog 生成 |
| `npm run db:backup` | 数据库备份 |
| `npm run db:migration:status` | 迁移状态 |
