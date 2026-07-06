# 快速开始

## 简介

App 生产工厂（App Factory）是一个 **AI 原生软件生产平台**。你只需要输入一个 App 想法，8 个 AI Agent 组成的团队会自动协作完成从立项到生成可运行代码的完整流程。

### 工作流程

```
用户想法 → CEO Agent → 产品经理 Agent → 架构师 Agent → 设计师 Agent
→ 开发负责人 Agent → 测试负责人 Agent → 安全合规 Agent → 商业顾问 Agent
→ App Spec 生成 → 三平台代码生成 → 下载/部署
```

每个 Agent 按串行流水线工作，逐步细化输出：

1. **CEO Agent** — 分析想法可行性，制定项目目标
2. **产品经理 Agent** — 输出 PRD / 用户故事 / 功能列表
3. **架构师 Agent** — 设计技术架构、数据模型、API 设计
4. **设计师 Agent** — 设计 UI 风格、主题色、组件
5. **开发负责人 Agent** — 生成 App Spec（中间表示层）
6. **测试负责人 Agent** — 设计测试策略
7. **安全合规 Agent** — 审计安全性、检查合规性
8. **商业顾问 Agent** — 商业价值分析、推荐行业模板

### 核心技术：App Spec

App Spec 是平台的核心中间表示层（IR），一份 JSON 描述文件定义了一个应用的完整结构和行为，然后被翻译成目标平台的代码：

```
App Spec (JSON) 
  ├── → Flutter 代码生成器 → iOS/Android/Web/Desktop 应用
  ├── → 微信小程序代码生成器 → 微信小程序
  ├── → 鸿蒙代码生成器 → HarmonyOS 应用
  └── → 后端代码生成器 → Supabase DDL + CRUD API
```

---

## 前提条件

- **Node.js 18+**（推荐 20+）
- **npm 9+**
- **Supabase 账号**（免费套餐即可）- [注册](https://supabase.com)
- **OpenAI API Key**（或兼容的 API 端点）
- **Git**（用于 GitHub 集成特性）

可选依赖（按需安装）：

- **Docker Desktop** — 用于 Flutter 沙箱代码生成（本地运行）
- **Flutter SDK 3.x** — 本地构建测试 Flutter 项目
- **微信开发者工具** — 微信小程序调试与预览
- **DevEco Studio** — 鸿蒙应用调试与构建

---

## 安装与配置

### 1. 克隆仓库

```bash
git clone https://github.com/guiming-rgb/app-factory.git
cd app-factory
```

### 2. 安装依赖

```bash
npm install
```

### 3. 配置环境变量

复制环境变量模板并填入配置：

```bash
cp .env.example .env.local
```

`.env.local` 需要配置的关键变量：

```bash
# === Supabase ===
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# === OpenAI ===
OPENAI_API_KEY=sk-your-api-key
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-4o

# === App URL ===
NEXT_PUBLIC_APP_URL=http://localhost:3000

# === Stripe（可选，用于计费）===
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# === GitHub OAuth（可选，用于代码推送）===
GITHUB_OAUTH_CLIENT_ID=your-client-id
GITHUB_OAUTH_CLIENT_SECRET=your-client-secret
```

### 4. 初始化数据库

项目使用 Supabase 作为数据库。创建必要的表结构：

```bash
# 应用所有数据库迁移
npm run db:apply:v4-all
npm run db:apply:v5-user-profiles
npm run db:apply:v5-memories
npm run db:apply:v5-skills-seed
```

也可以在 Supabase Dashboard 的 SQL Editor 中执行 `sql/` 目录下的迁移文件。

### 5. 启动开发服务器

```bash
npm run dev
```

访问 `http://localhost:3000`。

---

## 创建你的第一个项目

### 步骤 1：创建一个项目

在 Web UI 中，点击"新建项目"，填写：

- **项目标题** — 例如："校园二手交易平台"
- **项目想法** — 用自然语言描述你的 App 想法，越详细越好

示例输入：

```
一个面向大学生的校园二手交易平台。学生可以发布二手物品（教材、电子产品、
生活用品），设置价格和成色。其他学生可以浏览、搜索、收藏和私聊联系卖家。
平台包含分类浏览、搜索过滤、聊天沟通、个人中心等功能。
```

### 步骤 2：等待 AI Agent 流水线完成

提交后，9 个 Agent 串行工作。每个 Agent 的输出都会实时显示在界面上：

1. **CEO 分析** — 评估想法可行性和范围
2. **产品需求文档** — PRD 文档
3. **项目计划** — 里程碑与排期
4. **架构设计** — 技术方案
5. **安全审计** — 安全检查报告
6. **UI 设计** — 风格指南
7. **开发计划** — 代码生成准备
8. **测试策略** — 质量保障方案
9. **商业分析** — 商业价值评估

### 步骤 3：查看和编辑 App Spec

流水线完成后，平台会自动生成 **App Spec** — 应用的完整 JSON 描述。你可以在 Spec 编辑器中进行可视化编辑：

- **页面管理** — 添加/删除/修改页面及其类型
- **实体管理** — 添加/编辑数据模型和字段
- **导航配置** — 配置底部 Tab 导航
- **版本管理** — 保存、对比、回退 Spec 版本

### 步骤 4：生成代码

点击"代码生成"按钮，选择目标平台：

- **Flutter** — 生成 iOS/Android/Web/Desktop 应用
- **微信小程序** — 生成微信小程序源码
- **鸿蒙** — 生成 HarmonyOS ArkTS 应用
- **全部生成** — 三个平台同时生成

### 步骤 5：下载并运行

生成完成后，你可以：

- **下载 ZIP 包** — 直接在浏览器中下载生成的源码
- **推送到 GitHub** — 关联 GitHub 账号一键推送到仓库
- **查看 SQL** — 查看和复制生成的 DDL 建表语句
- **预览 HTML** — 查看 Web 预览

---

## 下一步

- [了解 App Spec 规范](/guide/app-spec) — 深入学习 App Spec 的完整结构和配置
- [浏览行业模板](/guide/industries) — 20 个开箱即用的行业模板
- [查看平台指南](/guide/platforms) — Flutter / 微信小程序 / 鸿蒙的构建与发布
- [学习 API](/api/) — 以编程方式创建项目和管理资源
