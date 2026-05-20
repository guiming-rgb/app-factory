# 验收 B — MVP v1.3 用量统计（超详细逐步指南）

> 目标：项目生成完成后，详情页出现 **「生成用量（v1.3）」**，Supabase 表 **`usage_logs`** 有 8 行。  
> 配套：[MVP-v1.3-usage_logs.md](./MVP-v1.3-usage_logs.md)

---

## 零、你需要提前准备好的

| 物品 | 说明 |
|------|------|
| 代码目录 | `app-factory`（本仓库 `main` 分支，已含 v1.3 代码） |
| Supabase | 能登录网页控制台，和平时生成项目用的是**同一个项目** |
| 两个终端窗口 | 一个跑网站，一个跑 Inngest（全程不要关） |
| 本机端口 | **3001**（因你机器 3000 常被其他 App 占用） |

**你上次成功的项目（可用来重新生成）：**

- 标题：类似俄罗斯方块的几何对接 app  
- 项目 ID：`30976292-beb2-4688-a03c-26261c263e9b`  
- 详情页网址：`http://localhost:3001/projects/30976292-beb2-4688-a03c-26261c263e9b`

---

## 第一步：在 Supabase 里建 `usage_logs` 表（只做一次）

### 1.1 打开 Supabase 网站

1. 浏览器打开 [https://supabase.com](https://supabase.com) 并登录。  
2. 进入你的 **App 生产工厂** 用的那个项目（和 `.env.local` 里 `NEXT_PUBLIC_SUPABASE_URL` 对应）。

### 1.2 打开 SQL 编辑器

1. 左侧菜单点 **「SQL Editor」**（SQL 编辑器）。  
2. 点 **「New query」**（新建查询）。

### 1.3 粘贴并执行 SQL

1. 在你电脑上打开文件（用 Cursor / 记事本均可）：  
   `app-factory/sql/migrations/20260519_usage_logs.sql`  
2. **全选** 文件里全部内容（约 21 行），**复制**。  
3. 回到 Supabase SQL 编辑器，**粘贴** 到空白编辑区。  
4. 点击右下角 **「Run」**（或 **「运行」**）。

### 1.4 怎样算成功？

- 下方结果区显示 **Success** / **成功**，没有红色报错。  
- 若提示 `relation "usage_logs" already exists` 或表已存在：**也算成功**，不用重复建表。

### 1.5（可选）确认表真的有了

1. 左侧点 **「Table Editor」**（表编辑器）。  
2. 在表列表里应能看到 **`usage_logs`**。  
3. 新表可能是空的，**正常**。

---

## 第二步：关掉以前可能还在跑的服务

若你之前开过终端跑网站或 Inngest，先停掉，避免旧代码还在跑。

1. 找到之前跑 `npm run start` 或 `npm run dev` 的终端。  
2. 在该终端里按 **`Ctrl + C`**（Mac 上也是 Control+C，或 `Cmd + .` 视终端而定），直到命令停止。  
3. 对跑 Inngest 的终端同样 **`Ctrl + C`**。

---

## 第三步：终端 A — 重新构建并启动网站（3001）

1. 打开 **终端**（Terminal）。  
2. 进入项目目录：

```bash
cd "/Users/guiming/Desktop/app生产工厂/app-factory"
```

3. 重新构建（让 v1.3 写入用量的代码生效，**第一次约 20 秒～1 分钟**）：

```bash
npm run build
```

4. 看到 **`Compiled successfully`** 或构建结束无报错后，启动网站：

```bash
npm run start -- -p 3001
```

5. **成功标志**（类似下面，不要关窗口）：

```text
- Local: http://localhost:3001
```

6. 用浏览器打开：**http://localhost:3001**  
   - 应能看到首页 **「App 生产工厂 MVP v1.2」**。

---

## 第四步：终端 B — 启动 Inngest（必须和 3001 对齐）

1. **再开一个** 新终端窗口。  
2. 同样进入目录：

```bash
cd "/Users/guiming/Desktop/app生产工厂/app-factory"
```

3. 执行（注意是 **3001**，不是默认 3000）：

```bash
npm run inngest:dev:3001
```

4. **成功标志**：终端显示 Dev Server 已启动，并提到 `http://localhost:3001/api/inngest`。  
5. **不要关这个窗口**。  
6. （可选）浏览器打开 **http://localhost:8288** 看 Inngest 本地面板，无大面积报错即可。

---

## 第五步：检查 `.env.local`（只需扫一眼）

在 `app-factory` 文件夹打开 **`.env.local`**，确认有：

| 变量 | 应填的值 |
|------|----------|
| `INNGEST_DEV` | `1` |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3001` |
| `NEXT_PUBLIC_SUPABASE_URL` | 你的 Supabase 地址 |
| `SUPABASE_SERVICE_ROLE_KEY` | 你的 service role key |
| `OPENAI_API_KEY` 等 | 与平时能生成时相同 |

改过后要 **重启终端 A**（`Ctrl+C` 再 `npm run start -- -p 3001`）。

---

## 第六步：对已完成项目「重新生成」（写入用量）

> **重要**：只有 **重新跑一遍 8 个 Agent**，才会往 `usage_logs` 写 8 行。只刷新页面不够。

### 6.1 打开项目详情

浏览器打开（把 ID 换成你的项目亦可）：

**http://localhost:3001/projects/30976292-beb2-4688-a03c-26261c263e9b**

或：首页 → **历史项目** → 点「俄罗斯方块…」那条。

### 6.2 点重新生成

1. 页面右上角找到 **「重新生成报告」**（浅黄色按钮）。  
2. **只点一次**，等浏览器弹出确认框，点 **确定**。  
3. 状态会变成 **「生产中」**，进度条从 0 慢慢到 8/8（可能要 **几分钟到十几分钟**，取决于模型速度）。

### 6.3 等待完成

- 可偶尔点 **「刷新状态」**。  
- 或等页面自动刷新（running 时会自动刷）。  
- **成功标志**：状态 **「已完成」**，**8/8 已完成**。

### 6.4 看 v1.3 是否通过

刷新页面后，在标题下方应出现 **灰色卡片**：

**「生成用量（v1.3）」**  
例如：`LLM 调用 8 次 · 总耗时 xx · Token 合计 xxxx`

若出现 **黄色提示**「未记录生成用量」：回到 **第一步、第三步、第四步** 检查是否漏做，再 **重新生成一次**。

---

## 第七步：在 Supabase 里核对 8 行数据（可选但推荐）

1. Supabase → **Table Editor** → 表 **`usage_logs`**。  
2. 看是否有 **8 行** 新数据。  
3. 列 **`project_id`** 应都是：`30976292-beb2-4688-a03c-26261c263e9b`（若你用的是别的项目，以你的 ID 为准）。  
4. **`total_tokens`** 列一般大于 0。

---

## 第八步：验收勾选（你自己打勾）

- [ ] 第一步 SQL 已执行成功  
- [ ] 终端 A：`localhost:3001` 网站能打开  
- [ ] 终端 B：`inngest:dev:3001` 在跑  
- [ ] 重新生成后 **8/8 已完成**  
- [ ] 详情页有 **「生成用量（v1.3）」**  
- [ ] `usage_logs` 表有 **8 行**

全部打勾 = **验收 B（v1.3）通过**。

---

## 九、常见问题

| 现象 | 处理 |
|------|------|
| 点生成后报 `fetch failed` | 终端 B 没开或没执行 `inngest:dev:3001` |
| 一直「生产中」不动 | 看终端 B、8288 是否有报错；终端 A 是否 3001 |
| 8/8 完成但没有用量卡片 | ① SQL 没执行 ② 没 `npm run build` 就 start ③ 没点「重新生成」 |
| SQL 报错 permission denied | 确认进的是正确 Supabase 项目 |
| 409 正在生成中 | 等当前跑完，不要连点 |

---

## 十、做完后告诉我什么（给协作 AI 用）

只需发一句，例如：

> v1.3 过了，项目 ID xxx，有 8 行 usage_logs

或发一张 **带「生成用量（v1.3）」卡片** 的详情页截图即可。
