# v2b — 微信原生小程序最小模板目录结构

> **状态**：已落盘 `templates/wechat-miniprogram-minimal/`（v2b-实现-1）  
> **能力边界**：[模板能力矩阵-微信小程序.md](./模板能力矩阵-微信小程序.md)

---

## 一、模板定位

| 项 | 约定 |
|----|------|
| 名称 | `wechat-miniprogram-minimal` |
| 基础库 | **≥ 2.30.0**（`project.config.json` libVersion） |
| 技术栈 | WXML + WXSS + JS（非 uni-app / Taro） |
| 后端 | **HTTPS + Supabase REST**（`utils/supabase.js`） |
| 登录 | **`wx.login` 占位**（`utils/auth.js`） |
| 支持界面 | Tab（首页列表占位 + 我的）+ 隐私弹窗 + 分包空壳 |
| 不支持 | 支付、直播、UGC 审核、重度地图（见能力矩阵） |

---

## 二、目录树

```text
templates/wechat-miniprogram-minimal/
├── README.md
├── app.json                  # 页面、tabBar、subPackages
├── app.js                    # globalData（Supabase / 隐私状态）
├── app.wxss
├── project.config.json       # 开发者工具工程配置
├── sitemap.json
├── assets/icons/             # Tab 占位图标（Generator 可替换）
├── pages/
│   ├── index/                # 首页 / 列表占位
│   └── profile/              # 我的 / wx.login 占位
├── components/
│   └── privacy-popup/        # 隐私政策弹窗
├── subpkg/placeholder/       # 分包空壳
├── utils/
│   ├── config.js
│   ├── supabase.js
│   └── auth.js
└── tool/
    └── codegen_manifest.json
```

---

## 三、与 App Spec 的对应（规划）

| Spec 字段（v0.2 规划） | 模板落点 |
|------------------------|----------|
| `targets.wechatMiniProgram.tabBar` | `app.json` → `tabBar.list` |
| `screens[].type === list` | `pages/index` 或生成 `pages/<id>/` |
| `limitations` | `README` / 生成根目录 `LIMITATIONS.md` |
| `complianceFlags.wechatCategoryHint` | 上架前人工配置，非模板编译项 |

v0.1 阶段在 `limitations` 写明小程序将按 v2b 模板生成即可。

---

## 四、变更记录

| 日期 | 说明 |
|------|------|
| 2026-05-20 | v2b-实现-1 目录落盘 + `npm run verify:wechat` |
