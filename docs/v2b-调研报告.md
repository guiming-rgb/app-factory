# MVP v2b 调研报告（微信原生小程序 · 线 B）

> **日期**：2026-05-20  
> **状态**：调研完成（文档）；**未**实现小程序 Generator  
> **性质**：**必选交付**（见 [多平台App生产工厂路线图.md](./多平台App生产工厂路线图.md)）

---

## 一、v2b 要做什么

与 v2a **共用 App Spec IR**，产出 **独立微信原生小程序工程**（WXML/WXSS/JS/JSON），可导入 **微信开发者工具** 编译；**不是** Web 套壳、不是 Flutter 转译。

---

## 二、与 v2a 的关系

| 项 | v2a Flutter | v2b 小程序 |
|----|-------------|------------|
| Spec 输入 | `targets.flutter` | `targets.wechatMiniProgram`（规划字段，v0.2 Schema 扩展） |
| 模板目录 | `templates/flutter-minimal/` | `templates/wechat-miniprogram-minimal/`（规划） |
| 构建 | `dart analyze` / `flutter build` | 微信开发者工具 CLI / 上传预览 |
| 登录 | Supabase Auth 等 | **`wx.login`** + 自建 `code2session` 或云函数 |

**可并行立项**；MVP v2 虚拟汇总 = **v2a + v2b 均验收**。

---

## 三、首版模板能力矩阵

详表：[模板能力矩阵-微信小程序.md](./模板能力矩阵-微信小程序.md)

**首版支持（规划）**：Tab 页、列表/详情占位、HTTPS 调 Supabase REST、`wx.login` 占位、分包结构空壳。  
**首版不支持**：直播、支付、UGC 审核、复杂地图、Flutter 同款代码复用。

---

## 四、目录结构（规划 · 未落代码）

```text
templates/wechat-miniprogram-minimal/
├── app.json
├── app.js
├── app.wxss
├── project.config.json
├── pages/
│   ├── index/
│   └── profile/
├── utils/
│   ├── supabase.js      # REST 封装（anon key + RLS）
│   └── auth.js          # wx.login 占位
├── sitemap.json
└── README.md
```

---

## 五、Spec 扩展（v0.2 规划，当前仍用 v0.1 + limitations）

```json
"targets": {
  "wechatMiniProgram": {
    "enabled": true,
    "minSdkVersion": "2.30.0",
    "tabBar": ["index", "profile"]
  }
}
```

v0.1 阶段可在 `limitations` 写明「小程序将按 v2b 模板生成」，避免 Spec 无字段时过度承诺。

---

## 六、合规与审核（必知）

| 项 | 说明 |
|----|------|
| 类目 | 用户业务需对照微信开放平台类目；工厂 Spec 应输出 `complianceFlags.wechatCategoryHint` |
| 域名 | request 合法域名须在后台配置；Supabase URL 需备案可达 |
| 隐私 | 首版须含隐私政策弹窗占位 |
| UGC | 默认 `requiresContentModeration` 若含用户发帖 |

---

## 七、Inngest 事件（规划）

`project/codegen.wechat.requested` — 与 `project/codegen.flutter.requested` 并列，不合并进方案 8-Agent 流水线。

---

## 八、v2b 最小验收（实现阶段）

1. Spec 通过 Validator（含小程序段或 limitations）。  
2. 产出目录导入微信开发者工具 **无编译错误**。  
3. 模拟器可打开首页 Tab（静态数据即可）。

---

## 九、建议下一立项

**v2b-实现-1**：`templates/wechat-miniprogram-minimal/` 最小 2 页 + `app.json` 可编译。

---

## 十、变更记录

| 日期 | 说明 |
|------|------|
| 2026-05-20 | 线 B 调研初版 + 小程序能力矩阵 |
