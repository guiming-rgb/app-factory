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

详情页历史表 **产物** 列：`Storage ✅` / `本地`。

---

## 维护者

- 无需手建 bucket（自动创建）；若 Dashboard 禁 auto-create，Storage → New bucket → `codegen-artifacts`（Private）。
- Service Role 需有 Storage 写权限（默认有）。
