# App 生产工厂 — Code Review 清单

> **用途**：PR / commit 前逐项自检；发现新坑后**追加**到对应章节。  
> **最后更新**：2026-06-25

---

## 1. 安全与密钥

- [ ] 无 `NEXT_PUBLIC_` 前缀的 service role / OpenAI / Inngest signing key
- [ ] 无 `.env.local`、PAT、`ghp_` 进入 diff
- [ ] API 路由有 auth / rate limit（改 `middleware.ts` 时复核）
- [ ] Stripe webhook 验签未绕过

## 2. Codegen / 三栈 Parity

- [ ] 改 `*-codegen/` 后跑 `npm run verify:industry:parity`
- [ ] 改 industry 路由后跑 `npm run verify:industry:e2e`
- [ ] 未把 parity 脚本退化为纯静态 grep
- [ ] 微信 list/detail/form 使用 `services/industry.js`（非裸 REST）
- [ ] 鸿蒙 game/payment 调用 `IndustryServices`（非纯 setTimeout）
- [ ] Flutter `pageWidgetRef` 传入 `industry`
- [ ] **未 commit `tmp/`**

## 3. 构建与测试

- [ ] `npm run build` 通过
- [ ] `npm test` 通过
- [ ] 新增 emit 函数有至少 smoke 测试（或 parity 断言覆盖）

## 4. 文档

- [ ] `docs/HANDOFF.md` 变更记录（里程碑级改动）
- [ ] `docs/模板能力矩阵.md` 与代码一致（game/payment 等列）
- [ ] commit message 无虚假「全线贯通」

## 5. 已知踩坑（追加区）

| 日期 | 问题 | 预防 |
|------|------|------|
| 2026-06-23 | parity v2 去掉动态生成，强度倒退 | 禁止静态-only parity |
| 2026-06-23 | `8938ca9` commit 整包 tmp | `.gitignore` + 禁止 add tmp |
| 2026-06-25 | `BaseCodegenExecutor` 引入 build 类型错误 | 改接口同步改三栈 executor |
| 2026-06-25 | 集成测试被 Flutter startup lock 卡数小时 | 勿并行多 flutter 命令；vitest timeout 关注 |
| 2026-06-25 | 未 `flutter pub get` 就 dart analyze 误报上千 issue | analyze 前先 pub get |

---

## 6. 生产 / 维护者项（Agent 不可代做）

- [ ] Supabase migration 是否需维护者 SQL
- [ ] Vercel redeploy 是否需维护者
- [ ] GitHub Secrets（Apple/Win 签名）是否需维护者

---

## 关联 Memory

- [[docs/memory/architecture-decisions]] — 架构决策日志（ADR）
- [[docs/memory/app-factory-tech-stack]] — 技术栈与踩坑
- [[app-factory-comprehensive-understanding]] — 架构/管道全维度理解（Claude 会话 memory）
- [[app-factory-quality-assessment]] — 全面质量评判（Claude 会话 memory）
