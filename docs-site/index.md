---
layout: home

title: App 生产工厂
titleTemplate: AI 描述即生成三平台应用

hero:
  name: "App 生产工厂"
  text: "AI 描述即生成三平台应用"
  tagline: 输入一个 App 想法，AI 团队自动完成立项、产品设计、技术架构、代码生成和部署 — 覆盖 Flutter / 微信小程序 / 鸿蒙 / 后端
  actions:
    - theme: brand
      text: 快速开始
      link: /guide/
    - theme: alt
      text: API 参考
      link: /api/
    - theme: alt
      text: 行业模板
      link: /guide/industries

features:
  - icon: 🧠
    title: 9 Agent 协同流水线
    details: CEO → 产品经理 → 项目经理 → 架构师 → 安全合规 → UI 设计师 → 开发负责人 → 测试负责人 → 商业顾问，9 个 AI Agent 串行协作生成完整项目方案、技术文档和可运行代码
  - icon: 📱
    title: 三平台同步生成
    details: Flutter (iOS/Android/Web/Desktop) + 微信小程序 + 鸿蒙 ArkTS，同一份 App Spec 定义自动生成三套原生源码，逻辑一致、风格统一
  - icon: 🗄️
    title: 后端自动建表
    details: 基于实体定义自动生成 Supabase DDL、RLS 安全策略、外键关系和完整 CRUD API，前端代码直接对接可用
  - icon: 🎨
    title: Spec 可视化编辑
    details: Web UI 直接查看和编辑 App Spec（页面、实体、字段、导航），支持版本管理、差异对比和回退，所见即所得
  - icon: 🔗
    title: GitHub 深度集成
    details: OAuth 授权登录 → 一键推送三栈仓库到 GitHub Pages → GHA CI/CD 自动构建 Mac/Win 桌面可分发安装包
  - icon: 🛒
    title: 20 个行业模板
    details: 电商、社交、CRM、外卖、酒店、招聘、健身、医疗、记账、影音等 20 个行业开箱即用模板，覆盖 ~90% 常见 App 类型
  - icon: 📊
    title: 全链路可观测
    details: Sentry 错误追踪、LLM 用量审计、代码生成质量评分、性能基准测试、全局用量仪表盘，生产级运维能力
  - icon: 🔒
    title: 安全与合规
    details: 行级安全策略 (RLS)、速率限制、用户隔离、安全合规 Agent 审查、Stripe 订阅计费、企业级 SSO
---

## 三步启动你的第一个 App

```bash
# 1. 克隆仓库
git clone https://github.com/guiming-rgb/app-factory.git
cd app-factory

# 2. 安装依赖
npm install

# 3. 启动开发环境
npm run dev
```

然后在浏览器打开 `http://localhost:3000`，创建一个项目，输入你的 App 想法即可。

[查看完整入门指南 →](/guide/)

## 支持的应用类型

App 生产工厂支持 22 种页面类型，可组合构建绝大多数常见应用场景：

| 页面类型 | 说明 | 适用场景 |
|---------|------|---------|
| `tabRoot` | 底部 Tab 导航根 | 多 Tab 应用结构 |
| `list` | 数据列表（支持搜索分页） | 商品列表、订单、资讯 |
| `detail` | 详情展示页 | 商品详情、文章详情 |
| `form` | 数据录入表单 | 创建/编辑、搜索 |
| `dashboard` | 数据仪表盘 | 数据总览、统计 |
| `card_grid` | 卡片网格布局 | 首页、推荐、瀑布流 |
| `calendar` | 日历视图 | 课表、排期 |
| `chart` | 图表报表 | 财务报告、数据分析 |
| `chat` | 即时通讯 | 消息列表、客服 |
| `map` | 地图展示 | 外卖配送、附近商家 |
| `payment` | 支付结算 | 收银台、购物车结算 |
| `kanban` | 看板视图 | 任务管理、项目跟踪 |
| `onboarding` | 引导页 | 新手引导、功能介绍 |
| `iot` | IoT 设备面板 | 智能家居控制 |
| `call` | 音视频通话 | 在线问诊、会议 |
| `game` | 游戏页面 | 游戏大厅、小游戏 |
| `ar` | AR 增强现实 | AR 展示、试穿 |
| `medical` | 医疗专用 | 电子病历、问诊 |
| `automotive` | 车载专用 | 车辆控制、导航 |
| `banking` | 银行专用 | 转账、账单 |
| `insurance` | 保险专用 | 保单、理赔 |
| `kyc` | 实名认证 | 身份验证、人脸识别 |

## 技术栈

**前端框架** · Next.js 14 (App Router) · TypeScript · Tailwind CSS · React 18

**后端** · Supabase (PostgreSQL + Auth + Storage + RLS) · Inngest (工作流引擎) · Stripe (计费)

**AI** · OpenAI GPT-4o / GPT-4o-mini · 自定义 Agent 编排

**代码生成** · Flutter 3.x (Dart) · 微信小程序 (WXML/WXSS/JS) · 鸿蒙 (ArkTS/ArkUI)

**部署** · Vercel (Web) · Docker (沙箱代码生成) · GitHub Actions (CI/CD)

**监控** · Sentry · Pino 日志 · 自定义用量仪表盘

---

<div style="text-align: center; margin-top: 2rem">
  <a href="/guide/" class="btn-primary">阅读完整指南 →</a>
</div>
