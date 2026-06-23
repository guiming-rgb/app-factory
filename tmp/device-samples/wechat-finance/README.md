# 微信原生小程序最小模板（wechat-miniprogram-minimal）

> App 生产工厂 **MVP v2b-实现-1**。配套：[v2b-微信小程序-最小模板-目录结构.md](../../docs/v2b-微信小程序-最小模板-目录结构.md)

## 能力（首版）

- Tab：**首页**（列表占位）+ **我的**（`wx.login` 占位）
- `utils/supabase.js`：HTTPS 调 Supabase REST（须配置合法域名）
- `components/privacy-popup`：隐私政策弹窗占位
- `subPackages`：`subpkg/placeholder` 空壳分包

## 本地运行

1. 安装 [微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)
2. **导入项目** → 选择本目录 `templates/wechat-miniprogram-minimal`
3. `appid` 可使用测试号 / 游客模式（`project.config.json` 默认 `touristappid`）
4. 编译后模拟器应能打开 Tab 首页

## Supabase（可选）

在 `app.js` 的 `globalData` 填入（与工厂 `.env.local` 一致），并在微信公众平台配置 **request 合法域名**：

```javascript
globalData: {
  supabaseUrl: "https://YOUR_PROJECT.supabase.co",
  supabaseAnonKey: "your_anon_key"
}
```

未配置时页面仍可编译运行，REST 调用会提示未配置。

## 终端验收（维护者少动手）

在工厂仓库根目录：

```bash
npm run verify:wechat
```

## Generator（规划 v2b-实现-2+）

复制本目录 → 按 App Spec `targets.wechatMiniProgram` 生成 `pages/*` 与 `app.json`。
