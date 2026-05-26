# v2 — 详情页 Codegen 按钮与 Storage

> **状态**：已实现（2026-05-25）

## 详情页（P1 — codegen 按钮）

项目 **`completed`** 后，详情页出现 **「代码生成」** 区块：

| 操作 | 说明 |
|------|------|
| 快速下载 Flutter / 小程序 | 同步 `export-*` API，即时 ZIP |
| **后台生成 Flutter ZIP** | `POST .../codegen/flutter` → Inngest |
| **后台生成小程序 ZIP** | `POST .../codegen/wechat` → Inngest |

组件：`components/CodegenPanel.tsx`（轮询、历史记录、下载链接）。

**本地须双进程**：`start -p 3001` + `inngest:dev:3001`。

---

## Supabase Storage（P2）

| 项 | 说明 |
|----|------|
| Bucket | 默认 **`codegen-artifacts`**（首次上传时 Service Role 自动创建） |
| 路径 | `{runId}/{fileName}.zip` |
| 写入 | `writeArtifactFile` → 本地 `/tmp` + Storage 双写 |
| 读取 | 本地优先；缺失时从 Storage 回源 |
| 禁用 | `.env.local` 设 `CODEGEN_STORAGE_DISABLED=1` |

### 环境变量

见 `.env.local.example`：`SUPABASE_STORAGE_BUCKET`、`CODEGEN_STORAGE_DISABLED`。

### 验收

```bash
npm run verify:codegen:storage
npm run verify:codegen:flutter -- <projectId>   # 完成后 metadata.storageUploaded 应为 true
```

详情页历史表 **产物** 列：`Storage ✅` / `本地`；Flutter codegen 成功后可点 **预览**（HTML mock，非 Flutter Web）。

---

## v2.1 自动修错（analyze 失败）

| 项 | 说明 |
|----|------|
| 模块 | `lib/codegen/auto-fix-flutter.ts` |
| 触发 | Docker `dart analyze` 失败时，LLM 返回 `{ patches: [{ relativePath, content }] }` |
| 轮次 | 默认最多 3 轮（`CODEGEN_AUTOFIX_MAX_ROUNDS`） |
| 禁用 | `CODEGEN_AUTOFIX_DISABLED=1` |
| metadata | `autoFixRounds`、`autoFixLog`；详情页历史表显示「自动修 N 轮」 |

---

## v3 HTML 预览

| 项 | 说明 |
|----|------|
| 生成 | `lib/codegen/preview-html.ts`（从 App Spec 生成静态手机 mock） |
| 存储 | `{runId}/preview/index.html`（本地 + Storage 双写） |
| API | `GET /api/projects/[id]/codegen/runs/[runId]/preview` |
| UI | CodegenPanel **预览** 链接；首页 **部署状态** → `/deploy` |
| 部署检查 | `GET /api/deploy/status` · `npm run check:deploy` |

---

## 小程序编译门禁（v2.1 / C3）

| 项 | 说明 |
|----|------|
| 结构 | `lib/sandbox/wechat-validate.ts` — JSON/JS/页面结构 |
| 真编译 | `lib/sandbox/wechat-compile.ts` — 官方 wcc/wcsc（`miniprogram-compiler`） |
| 编排 | `lib/sandbox/wechat-build.ts` — 结构通过后跑 WXML/WXSS 编译 |
| 触发 | wechat codegen 完成后 `runWechatFullBuildValidate` |
| CLI | `npm run verify:wechat:build` · `npm run verify:c3:wechat-compile` |
| 禁用结构 | `CODEGEN_WECHAT_BUILD_DISABLED=1` |
| 禁用编译 | `CODEGEN_WECHAT_COMPILE_DISABLED=1` |
| metadata | `buildStatus`、`structureStatus`、`compileStatus`、`buildOutput` |
| 同步验收 | `npm run verify:codegen:wechat -- <projectId>` |
| 异步 E2E | `npm run verify:codegen:async -- <projectId> wechat` |

---

## 维护者

- 无需手建 bucket（自动创建）；若 Dashboard 禁 auto-create，Storage → New bucket → `codegen-artifacts`（Private）。
- Service Role 需有 Storage 写权限（默认有）。
