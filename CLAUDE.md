# Claude / AI 协作入口

本仓库的 **记忆、Cursor 规则、重要资料** 统一索引：

👉 **[docs/Claude共享记忆-总索引.md](docs/Claude共享记忆-总索引.md)**

- Tier-1 必读文档列表  
- 四个 `.cursor/rules/*.mdc` 行为章程  
- 复制给 Claude Project 的 Instructions 与开场模板  
- 路径 / 环境 / 战略速查  

**勿**将 `.env.local` 交给任何 AI（含密钥）。

---

## 代码智能工具（优先级从高到低）

本仓库已同时接入 CodeGraph 和 jCodeMunch。**先查后读、先问后搜**：

### CodeGraph — 代码理解首选

`.codegraph/` 已建索引，守护进程运行中。查代码结构、调用关系、符号定位时：

- **首选** `codegraph_explore`（一个调用返回相关符号源码 + 调用路径，等价于 Read）
- **文件读取** 用 `codegraph_node`（带行号 + 被谁依赖）
- **不要** 上来就 grep/find/Read —— CodeGraph 更准更快

### jCodeMunch — 架构分析 + 重构安全

仓库 ID：`guiming-rgb/app-factory`，377 文件 / 1,755 符号已索引。

| 场景 | 工具 |
|------|------|
| 理解代码 | `search_symbols` → `get_symbol_source` |
| 全文搜 | `search_text` |
| 调用链 | `get_call_hierarchy` |
| 改前影响面 | `get_blast_radius` |
| 删除安全 | `check_delete_safe` |
| 编辑安全 | `check_edit_safe` |
| 死代码 | `get_dead_code_v2` |
| 热点 | `get_hotspots` |
| 循环依赖 | `get_dependency_cycles` |
| 仓库体检 | `get_repo_health` |
| 任务上下文 | `plan_turn` |
| 预算上下文 | `get_ranked_context` |

### 协作模式

```
理解代码:    CodeGraph explore → 不够 → jCodeMunch search → 还不够 → grep/Read
改代码前:    jCodeMunch check_edit_safe / get_blast_radius
删代码前:    jCodeMunch check_delete_safe
体检:        jCodeMunch get_repo_health
```
