# C5 — App Spec 阶段 C

> **状态**：✅（2026-05-22）· 验收 `npm run verify:c5:app-spec`

## 交付

| 项 | 说明 |
|----|------|
| 小程序完整 Spec | `targets.wechatMiniProgram`：`enabled` · `tabBar` · `loginMethod` · `subPackages` |
| BackendTarget | `lib/app-spec/backend-target.ts` · `resolveBackendTarget()` · 产物 `BACKEND.md` |
| 归一化 | `normalize-wechat-target.ts` · `merge-spec` / `resolveWechatTabIds` |
| Schema | `docs/schemas/app-spec-v0.1.schema.json` 扩展 |
| 示例 | `docs/schemas/examples/valid-wechat-full.json` |
| 生成器 | Flutter / 微信小程序 ZIP 根目录写入 `BACKEND.md`；小程序 `app.json` 支持 `subPackages` |

## BackendTarget 行为

| provider | codegenSupported | 环境占位 |
|----------|------------------|----------|
| `supabase` | ✅ | `SUPABASE_URL` · `SUPABASE_ANON_KEY` |
| `nest` | ❌（文档占位） | `API_BASE_URL` |
| `custom` | ❌ | `API_BASE_URL` |

首版仍默认 `targets.backend.provider: "supabase"`；`nest` / `custom` 仅 Spec 与文档层抽象，不阻断生成。

## 命令

```bash
npm run verify:c5:app-spec
npm run validate:spec -- docs/schemas/examples/valid-wechat-full.json
```

## 与 C1 关系

C1 负责 Report→Spec 收紧（screens/navigation）；C5 在 **targets** 层补齐小程序与后端契约，供 Generator 与后续鸿蒙栈复用。
