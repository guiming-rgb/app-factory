# v2b-实现-2 — 微信小程序 Generator PoC

> **状态**：已实现（2026-05-20）  
> **上位**：[v2b-实现-1-微信小程序最小模板.md](./v2b-实现-1-微信小程序最小模板.md)

## 能力

| 项 | 说明 |
|----|------|
| 输入 | 通过 Validator 的 App Spec v0.1 |
| 模板 | 复制 `templates/wechat-miniprogram-minimal/` 并补丁 |
| 生成 | `app.json`（tabBar / 标题）、首页文案、`project.config.json`、额外 Tab 页 |
| 产物 | ZIP；含 `app_spec.json`、`LIMITATIONS.md` |
| API | `GET/POST /api/projects/[id]/export-wechat` |
| CLI | `npm run codegen:wechat`、`npm run verify:wechat-codegen` |

**未做**：Inngest `project/codegen.wechat.requested`、`codegen_runs` 表。

## 命令组 G8 — 小程序 codegen 门禁（3 条）

```bash
cd "/Users/guiming/Desktop/app生产工厂/app-factory"
npm run verify:wechat-codegen
echo "G8 完成"
```

快捷即一条：`npm run verify:wechat-codegen`。

## 维护者

- 终端：**G8** 或 `verify:wechat-codegen`
- UI：项目详情「下载微信小程序（ZIP）」
- GUI（可选）：微信开发者工具导入生成目录验证编译
