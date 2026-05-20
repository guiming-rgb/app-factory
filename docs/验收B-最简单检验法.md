# v1.3 最简单检验法（推荐）

不必在详情页找「v1.3」字样，也不必打开 `/usage` 网页。

## 方法一：一条命令（首选 · 维护者也可只跑这条）

Agent 已跑双进程并触发生成后，在项目目录：

```bash
cd "/Users/guiming/Desktop/app生产工厂/app-factory"
npm run accept
```

（内部含 `verify:v13`；通过即无需再点详情页。）

仅查用量、不查 .env 时：

```bash
npm run verify:v13
```

终端最后出现 **「✅ v1.3 通过」** 即可。

指定某个项目 ID：

```bash
npm run verify:v13 -- 833ad678-f204-40d7-a47c-5b76e803f64f
```

| 输出 | 含义 |
|------|------|
| `usage_logs 行数：8 / 期望 8` + ✅ | v1.3 通过 |
| 行数是 0 + ❌ | 需 build 后重新生成一次 |
| 查 usage_logs 失败 | Supabase 未执行迁移 SQL |

## 方法二：只点 Supabase（不用终端命令）

1. 打开 https://supabase.com/dashboard → **与 `.env.local` 中 `NEXT_PUBLIC_SUPABASE_URL` 一致的项目**（本机验收时为 **dllaezdyxmoebkkwbftd**；勿与仅用于建表的其他项目混用）
2. 左侧 **Table Editor** → 表 **`usage_logs`**
3. 筛选 **project_id** = 你的项目 ID
4. **有 8 行** = v1.3 通过

## 说明

- 首页写 **MVP v1.2**、报告写 **MVP v1** 都不代表 v1.3 失败。
- **v1.3** 只表示「用量是否写入 `usage_logs`」，以 **8 行** 或 **`npm run verify:v13`** 为准。

**问题与结论全文**：[验收B-v1.3-问题与结论记录.md](./验收B-v1.3-问题与结论记录.md)
