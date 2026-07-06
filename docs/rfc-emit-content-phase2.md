# RFC — Emit 内容 Phase2（Mustache 全覆盖 + 巨石消除）

> **前置**：`rfc-emit-refactor.md` P0–P4 已完成（接线/守门/配置真源）  
> **本 RFC**：生成**内容层**完善 — Mustache 扩面、emit 瘦身、service 体配置化

## 1. 范围

| 波次 | 目标 | 状态 |
|------|------|------|
| **线 A** | WIP 收敛、snapshot、device 修复、文档边界 | 进行中 |
| **B1** | 19 行业 Mustache 为唯一 Widget 真源 | 进行中 |
| **B2** | `emit-extended` / `emit-fintech` 文件拆分 | 进行中 |
| **B3** | 鸿蒙 service 方法体 JSON 生成器起步 | 起步 |
| **线 C** | P3-F / R1 发行 SOP + 门禁骨架 | 文档化 |

## 2. 诚实边界（P0–P4 未做）

- 非行业 emit 仍是裸字符串（本 RFC B2 处理）
- 鸿蒙 `INDUSTRY_METHODS` 复杂方法体仍 TS 硬编码（B3 渐进）
- `check:emit:lines --strict` 待 B2 达标后纳入 CI

## 3. B1 验收

```bash
npm run verify:p2:all
npm run verify:p2:all -- --deep
npm test -- lib/__tests__/emit-industry-snapshot.test.ts
```

- `P2_PILOT_INDUSTRIES` = 19 行业
- `emit-industries/*.ts` legacy 已删除
- `getIndustryWidgetsDart` → Mustache only

## 4. B2 验收

```bash
npm run check:emit:lines
# flutter 栈 < 5000 行
```

## 5. B3 入口

- `config/harmony/service-method.schema.json`
- `lib/harmony-codegen/harmony-method-generator.ts`

## 6. 线 C 入口

- `docs/release-pipeline-sop.md`
- `npm run verify:release:readiness`
