# 验收 A — 逐步操作指南（超详细）

> 配套勾选表：[验收记录.md](./验收记录.md)  
> 若某步失败，先看本文 **「十、常见问题」**，再查 [版本与分支.md](./版本与分支.md)、[README.md](../README.md)。

---

## 零、开始前你需要有什么

| 物品 | 说明 |
|------|------|
| 电脑 | macOS / Windows / Linux 均可 |
| Node.js | 能跑 `npm`（建议 LTS） |
| 浏览器 | Chrome / Edge / Safari 均可 |
| **Supabase 账号与项目** | 已建一个 PostgreSQL 项目，且能打开网页控制台 |
| **大模型 API** | 已拿到 Key；`.env.local` 里用 `OPENAI_BASE_URL` + `OPENAI_MODEL` + `OPENAI_API_KEY`（兼容 DeepSeek 等） |

下面默认：项目代码在文件夹 **`app-factory`** 里；网站端口 **`3000`**（与 `npm run dev:3000` 一致）。

---

## 第一步：打开两个终端窗口（先别关）

你要 **同时** 开着下面两个窗口，验收全程都保持运行。

### 1-A 终端 A（跑网站）

1. 打开 **终端 / Terminal / PowerShell**。  
2. 进入项目目录（路径按你机器改，示例）：

```bash
cd "/Users/guiming/Desktop/app生产工厂/app-factory"
```

3. 若从没装过依赖，执行一次：

```bash
npm install
```

4. 启动网站（**固定 3000 端口**，方便和 Inngest 默认地址对齐）：

```bash
npm run dev:3000
```

5. **成功标志**：终端里出现类似 `Ready on http://localhost:3000`，**不要关这个窗口**。

### 1-B 终端 B（跑 Inngest 本地 worker）

1. 再打开 **第二个** 终端窗口。  
2. 同样 `cd` 到 **`app-factory`**。  
3. 执行：

```bash
npm run inngest:dev
```

4. **成功标志**：终端里会显示 Dev Server 已启动，并提到连接到你的 App 的 Inngest 地址；**不要关这个窗口**。  
5. **可选**：终端里若打印了 **Inngest 本地控制台** 地址，常见为：

**网址：`http://localhost:8288`**

在浏览器新开一个标签页打开它，用来观察「函数是否注册、事件是否被消费」（看不懂也没关系，只要没有大面积报错即可）。

---

## 第二步：检查配置文件 `.env.local`

1. 在 **`app-factory`** 文件夹里找到 **`.env.local`**（没有则从 **`.env.local.example`** 复制一份改名）。  
2. 用文本编辑器打开 **`.env.local`**，确认至少有（值填你自己的，这里不写真实密钥）：

| 变量名 | 作用 |
|--------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 项目 URL |
| `SUPABASE_SERVICE_ROLE_KEY` | 服务端读写数据库（保密） |
| `OPENAI_API_KEY` | 模型 Key |
| `OPENAI_BASE_URL` | 厂商 API 根地址 |
| `OPENAI_MODEL` | 模型名 |
| `NEXT_PUBLIC_APP_URL` | 填 **`http://localhost:3000`**（与第一步端口一致） |
| **`INNGEST_DEV=1`** | **本地必加一行**，否则容易出现 `PUT /api/inngest` **500** |

3. 若你改过端口（例如用 3001），则 **`NEXT_PUBLIC_APP_URL`** 要改成 `http://localhost:3001`，且终端 B 里不能用默认脚本，需按 [版本与分支.md](./版本与分支.md) 改 `inngest:dev` 的 `-u` 地址。  
4. 改完 **`.env.local` 后**，需要 **重启终端 A** 的 `npm run dev:3000` 才生效。

---

## 第三步：确认数据库里已有表（只做一次或换库时做）

1. 浏览器打开 **Supabase 控制台**（登录 [https://supabase.com](https://supabase.com) → 选中你的项目）。  
2. 左侧点 **「SQL Editor」**（SQL 编辑器）。  
3. 打开你电脑上的两个文件（用编辑器或 IDE）：  
   - **`app-factory/sql/schema.sql`** — 全选复制 → 粘贴到 SQL Editor → 点 **Run**。  
   - **`app-factory/sql/seed.sql`** — 同样复制 → Run。  
4. 左侧点 **「Table Editor」**，确认有 **`projects`**、**`agent_runs`** 等表（与 schema 一致即可）。

---

## 第四步：打开工厂网站首页

1. 确认 **第一步** 里终端 A、B **仍在运行**。  
2. 浏览器地址栏输入（或点击）：

**网址：`http://localhost:3000`**

3. 应看到 **App 生产工厂** 首页，有「想法」输入框和提交按钮。

---

## 第五步：新建一个项目（拿到项目详情页）

1. 在首页 **「想法」** 输入框里输入一段文字，长度要求：**至少 10 个字**（中文、英文都可以），最多按产品限制（见交接文档，一般足够长即可）。  
2. 点击 **创建 / 提交** 类按钮。  
3. 浏览器会跳转到 **项目详情页**，地址形如：

**网址：`http://localhost:3000/projects/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`**

其中最后一段 **`xxxxxxxx-...`** 是一串 **UUID**，这就是 **`projects.id`**。  
**请复制保存**（后面 Supabase 里要用）。

4. 此时项目状态一般是 **`pending`**，页面上会有 **「启动 AI 后台生产」**（或同义按钮）。

---

## 第六步：启动生成并等待完成

1. 在详情页点击 **「启动 AI 后台生产」**。  
2. **预期现象**：  
   - 按钮点下去后 **很快** 有反应（**不是**几分钟卡在一个请求上不动）；  
   - 页面状态变为 **`running`**，可能出现进度或「x/8」类提示；  
   - **终端 B**（Inngest）里会有活动日志（表示后台在工作）。  
3. **等待**：直到页面显示 **`completed`**（完成）。时间取决于模型速度与网络，可能数分钟。  
4. **失败时**：若变成 **`failed`**，看详情页错误提示；终端 A 里也可能有报错。先不要继续勾选验收，先排错（见第十节）。

---

## 第七步：在页面上做「看得见」的检查

仍在 **`http://localhost:3000/projects/你的UUID`** 这一页：

1. 向下滚动，确认能看到 **8 个 Agent** 各自的结果区块（或等价展示）。  
2. 确认有 **最终报告 / final_report** 大块文字内容。  
3. **（验收 A 建议做）** 若页面上有 **导出 / 下载 Markdown**，点一次，确认能下载文件。  
4. **（验收 A 建议做）** 若有 **复制报告**，点一次，在别处粘贴确认有内容。

---

## 第八步：测「历史列表」

1. 浏览器新开标签页，地址栏输入：

**网址：`http://localhost:3000/projects`**

2. 应看到 **项目列表**，里面包含你刚创建的那一条（标题可能是自动截取的 idea 摘要）。

---

## 第九步：测「running 时不能再开跑」→ 409

**说明**：必须再有一个 **处于 running** 的项目才能测；若你上一步已经 **completed**，可以用下面两种方式 **任选一种**。

### 方式甲（再建一个新项目）

1. 打开 **`http://localhost:3000`**，再创建一个项目。  
2. 进入新项目详情页，点 **「启动 AI 后台生产」**。  
3. 在仍是 **`running`** 时 **立刻再点一次** 同一按钮。  
4. **预期**：第二次应被拒绝，表现为 **409** 或页面提示「已在运行」类语义（与 [README.md](../README.md) API 说明一致）。

### 方式乙（用浏览器开发者工具看 HTTP 状态码，可选）

1. 浏览器按 **F12** 或 **右键 → 检查**，打开 **Network（网络）**。  
2. 在 **`running`** 时第二次点生成，点选 **`generate`** 那条请求，看 **Status** 是否为 **409**。

---

## 第十步：Supabase 里查「八条」与最终状态（数据检疫）

1. 回到 **Supabase 控制台** → **SQL Editor**。  
2. 把下面 SQL 里的 **`'<你的 projects.id>'`** 换成 **第五步** 复制的 **UUID**（保留单引号）。

```sql
-- 1）项目是否 completed、报告是否有字
select id, status, length(coalesce(final_report, '')) as final_report_len
from projects
where id = '<你的 projects.id>';

-- 2）是否正好 8 条 agent 记录
select count(*) as agent_run_rows
from agent_runs
where project_id = '<你的 projects.id>';

-- 3）每条 agent 状态（应全是 completed）
select agent_id, status, count(*) as n
from agent_runs
where project_id = '<你的 projects.id>'
group by agent_id, status
order by agent_id;
```

3. **通过标准**：  
   - 查询 1：`status` = **`completed`**，且 `final_report_len` **大于 0**。  
   - 查询 2：`agent_run_rows` = **8**。  
   - 查询 3：每个 `agent_id` 对应的都是 **`completed`**（没有 `failed`）。

这 **8 条** 就是 **8 个 Agent 各跑完一轮** 在数据库里的记录。

---

## 第十一步（建议）：关页面后台仍能跑完（v1.2）

1. **再新建一个项目**（或用一个你愿意重跑的 `failed` 项目按页面规则重试）。  
2. 进入详情页，点 **「启动 AI 后台生产」**，确认已进入 **`running`**。  
3. **直接关掉该项目的浏览器标签页**（甚至关掉整个浏览器均可），**终端 A、B 保持运行**。  
4. 等几分钟后，重新打开：

**网址：`http://localhost:3000/projects/该项目的UUID`**

5. **预期**：状态应为 **`completed`**，且同样有 **8 条** `agent_runs`（对该 `project_id` 再跑第十步 SQL 验证）。

---

## 第十二步：填纸质/文档记录并收工

1. 打开本仓库 **`docs/验收记录.md`**，从第一节开始 **逐项勾选**。  
2. 把 **验收日期、分支、Supabase 说明、模型说明、项目 UUID** 填进「元信息」表（**不要**把 Service Role Key 贴进 Git）。  
3. 若全部通过：  
   - 更新 **`docs/HANDOFF.md`** 里「验收 A」为已勾选；  
   - 更新 **`docs/执行计划.md`** 第二节「上次进展」；  
   - `git add` + `git commit`（说明里写「验收 A 通过」）。

---

## 十、常见问题（先做这些再慌）

| 现象 | 建议 |
|------|------|
| `PUT /api/inngest` **500** | 检查 **`.env.local` 是否有 `INNGEST_DEV=1`**，改完 **重启终端 A**。 |
| 一直 **`running`**，没有 8 条 | 看 **终端 B** 是否还在跑；打开 **`http://localhost:8288`** 看函数/事件；确认 **终端 A 端口** 与 `inngest:dev` 指向的 URL 一致。 |
| **`failed`** | 看页面 `error_message`；常见是 **Key / Base URL / 模型名** 填错或额度用尽。 |
| 导出打不开 | 确认地址是 **`http://localhost:3000/api/projects/UUID/export`**（把 UUID 换成你的）；且项目已 **completed**。 |

---

## 网址速查表

| 名称 | 网址 |
|------|------|
| 工厂首页 | `http://localhost:3000` |
| 项目列表 | `http://localhost:3000/projects` |
| 某项目详情 | `http://localhost:3000/projects/<UUID>` |
| Inngest 本地控制台（常见） | `http://localhost:8288` |
| Inngest 连你的 App | `http://localhost:3000/api/inngest`（给 CLI 用，一般不用手点） |
| 导出 Markdown（验收用） | `http://localhost:3000/api/projects/<UUID>/export` |
| Supabase | 浏览器登录 [https://supabase.com](https://supabase.com) 后进入你的项目；**SQL Editor** 在左侧菜单 |

完成以上步骤即完成 **验收 A** 的文档定义；若你愿意，可把「第几步卡住了」发给我继续排查。
