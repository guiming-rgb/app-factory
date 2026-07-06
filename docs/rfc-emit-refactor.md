# RFC：三栈 Emit 重构与质量门禁路线图

> **状态**：Accepted（P0 基线）  
> **作者**：Cursor 主实施 · Claude-DeepSeek 副审  
> **日期**：2026-07-06  
> **真源接力**：[HANDOFF.md](./HANDOFF.md) · [CLAUDE.md](../CLAUDE.md) §十一

---

## 1. 背景与问题

### 1.1 现状

| 维度 | 数据（2026-07-06 基线） |
|------|------------------------|
| Flutter emit | `lib/flutter-codegen/emit*.ts` 合计 ~9.7k 行 |
| 微信 emit | `lib/wechat-codegen/emit*.ts` ~1.8k 行 |
| 鸿蒙 emit | `lib/harmony-codegen/emit*.ts` ~1.8k 行 |
| Mustache 模板 | 82 个 `.mustache` 与裸字符串 emit **双轨并存** |
| 产物验证 | 仅 Flutter 接入 `verifyGeneratedArtifact`；微信/鸿蒙跳过 |
| emit 单测 | 三栈 `*-codegen/` 目录 **0** 个 `.test.ts` |
| 行业检测 | `detectIndustry()` 返回字符串，**无置信度** |

### 1.2 审计结论（v3-2026-07-06）

- **架构 B**：三栈独立 generate + `base-executor` 模板方法合理，但 emit God Module 阻碍演进
- **代码质量 B-**：字符串拼接 + 双轨模板，缺 snapshot 回归网
- **逻辑 B**：行业检测无置信度反馈；产物验证不完整

### 1.3 目标

在 **不阻塞现有 914 测试 + 三栈 parity/e2e 全绿** 的前提下，分 5 阶段（P0–P4）渐进重构 emit 层，每阶段写 HANDOFF 段供跨会话接力。

---

## 2. 五阶段路线图

```
P0 (1–2 会话)  RFC + ledger + 基线记录
    ↓ 门禁全绿
P1 (1–2 周)    snapshot · 三栈 verify · detectIndustry 置信度 · emit 行数软门禁
    ↓ 门禁全绿再动 emit
P2 (4–6 周)    Mustache 迁移 · 配置表化 · shared-emit；试点 finance/ecommerce/medical
    ↓ 每周 1 次 parity 全量
P3 (与 P2 后半重叠)  flutter-codegen 拆分 · YAML 行业配置 · parity 增量 · SSO JSON 路径
P4 (与 P3 重叠)      CI 矩阵 · codegen 可观测 · 矩阵自动生成 · WIP commit · 真机 SOP
```

**原则**：P3/P4 不阻塞 P1 收益；每完成一个 P 阶段在 `HANDOFF.md` 写 HANDOFF 段。

---

## 3. P0 — RFC + Ledger + 基线（本轮）

### 3.1 交付物

| 项 | 路径 | 验收 |
|----|------|------|
| 本文档 | `docs/rfc-emit-refactor.md` | 五阶段路线图 + 门禁定义 |
| HANDOFF P0 段 | `docs/HANDOFF.md` §P0 | 基线数字 + 下一入口 P1 |
| Ledger 引用 | `CLAUDE.md` §十一 | 路线图真源指向本文 |

### 3.2 基线门禁（P0 记录）

```bash
cd app-factory
npm test && npm run build && npm run lint
npm run verify:industry:parity
npm run verify:industry:e2e
npm run verify:industry:templates
```

| 门禁 | 目标 |
|------|------|
| `npm test` | 914/914 |
| `npm run lint` | 0 errors |
| `npm run build` | 通过 |
| `verify:industry:parity` | 173/0 |
| `verify:industry:e2e` | 180/0 |
| `verify:industry:templates` | 105/0 |

Git HEAD：`f0aab20`（大量 WIP 未 commit，按用户要求不主动 commit）。

---

## 4. P1 — 质量网（不动 emit 重构）

### 4.1 三栈产物验证

扩展 `lib/codegen/verify-artifact.ts`：

| 栈 | 检查项 |
|----|--------|
| Flutter | pubspec.yaml · app_router.dart · auth · SQL · dart analyze（已有） |
| 微信 | app.json · project.config.json · app.js · pages/ 目录 |
| 鸿蒙 | oh-package.json5 · EntryAbility.ets · main_pages.json · pages/*.ets |

`base-executor.ts` Stage 8 后统一调用 `verifyCodegenArtifact(path, target)`。

### 4.2 detectIndustry 置信度

```typescript
type IndustryDetectionResult = {
  industry: IndustryCategory;
  confidence: number;  // 0–1
  source: "metadata" | "keyword" | "generic";
  matchedKeywords?: string[];
};
```

- `detectIndustry()` 保持向后兼容（返回 `industry` 字符串）
- `detectIndustryWithConfidence()` 新 API
- `codegen_runs.metadata` 写入 `industryDetected` / `industryConfidence` / `industrySource`
- UI：`CodegenRunRow` + `qualityGateBadges` 展示行业徽章

### 4.3 Emit Snapshot（Flutter 试点）

Vitest snapshot，先覆盖 3 行业：

- `emitFinanceWidgetsDart()`
- `emitEcommerceWidgetsDart()`
- `emitFlutterMedicalBLEDevice()`（`emit-medical.ts`）

### 4.4 Emit 行数软门禁

`scripts/check-emit-line-count.mjs` + `npm run check:emit:lines`

- 默认 **warn**（exit 0）
- `--strict` 时超阈值 exit 1（CI 可选）
- 阈值：单文件 1000 行 · 单栈合计 5000 行

### 4.5 P1 完成标准

- 上述 4 项全部落地
- 全门禁仍全绿
- HANDOFF §P1 段落

---

## 5. P2 — Emit 重构试点（4–6 周）

### 5.1 范围

**先不动全量 19 行业**，试点：

- finance
- ecommerce
- medical

### 5.2 技术方向

1. **Mustache 迁移**：将裸字符串 emit 中重复块迁入 `.mustache`，三栈共用上下文 schema
2. **配置表化**：行业 widget 清单、路由表、颜色 token 从 TS 字符串抽为 JSON/YAML
3. **shared-emit**：`lib/app-spec/emit-shared/` 放三栈共用的实体列表/详情/表单逻辑

### 5.3 节奏

- 每周 1 次 `verify:industry:parity` 全量
- 试点行业 parity 子集每日可跑
- 行数软门禁 `--strict` 纳入 pre-commit（可选）

---

## 6. P3 — 架构拆分（与 P2 后半重叠）

| 项 | 说明 |
|----|------|
| flutter-codegen 拆分 | `emit-industry.ts` → 按行业文件；`dart-emit.ts` 路由表驱动 |
| YAML 行业配置 | `config/industries/*.yaml` 替代硬编码 regex 块 |
| parity 增量 | 仅跑变更行业 × 三栈（`--filter=finance`） |
| SSO JSON 路径 | `enterprise/sso` 配置外置 JSON schema 校验 |

---

## 7. P4 — 运维与 CI（与 P3 重叠）

| 项 | 说明 |
|----|------|
| CI 矩阵 | GHA：emit snapshot + parity 子集 + check:emit:lines --strict |
| codegen 可观测 | `codegen_runs.metadata` 标准字段 + Sentry breadcrumb |
| 矩阵自动生成 | `detect-industry-matrix.json` 从 YAML 生成 |
| WIP commit | 分批 commit 策略（D-01） |
| 真机 SOP | `verify:industry:device` 维护者手册 |

---

## 8. 非目标（本 RFC 不做）

- 不改 App Spec Schema 版本
- 不合并三栈 `generate.ts` 为单文件
- 不在 P1 前动 emit 字符串内容（仅加测试网）
- 不主动 git commit（除非用户明确要求）

---

## 9. 风险与缓解

| 风险 | 缓解 |
|------|------|
| snapshot 脆化 | 仅锁 3 行业试点函数；P2 重构时批量更新 |
| verify 误杀合法产物 | 结构检查为主，编译检查 optional/skipped |
| 双轨模板漂移 | P2 统一 Mustache 真源 |
| 会话断裂 | 每 P 阶段 HANDOFF 段 + 本文 §3.2 基线表 |

---

## 10. 引用

- [app-factory-v3-2026-07-06 审计报告](./审计报告/app-factory-v3-2026-07-06.md)
- [audit-merged-checklist-2026-07-05](./audit-merged-checklist-2026-07-05.md)
- [模板能力矩阵](./模板能力矩阵.md)
