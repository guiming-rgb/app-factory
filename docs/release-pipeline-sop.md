# 发行流水线 SOP（P3-F / R1）

> **线 C** — 维护者手册；需外部账号与密钥，代码仓仅提供门禁骨架。

## 前置条件

| 平台 | 依赖 |
|------|------|
| iOS | Apple Developer Program、签名证书、Provisioning Profile |
| Android | Google Play Console、keystore |
| 微信小程序 | 微信商户号（支付）、AppID、上传密钥 |
| Stripe | `STRIPE_SECRET_KEY`、Webhook |

## 本地门禁

```bash
# 行业三栈产物已生成
npm run verify:p2:pilot
npm run verify:industry:device

# 发行就绪探针（结构/文档/环境变量占位）
npm run verify:release:readiness
```

## 步骤（维护者）

### 1. 签名与构建

- Flutter: `npm run verify:t:desktop:build` 或 CI `flutter-desktop-dual-build.yml`
- 微信: 开发者工具上传 + `verify:c3:wechat-compile`
- 鸿蒙: `verify:harmony` + DevEco 真机

### 2. 隐私与合规

- 生成隐私政策：`/api/generated-privacy`
- App Spec `limitations` 与商店描述一致

### 3. 提审

- iOS: Transporter / Xcode Archive
- Android: Play Console Internal Testing → Production
- 微信: 版本管理 → 提交审核

### 4. 支付（可选）

- Stripe Connect / 微信商户号接入后跑 `verify:c4:production`

## 未完成项（需维护者）

- [ ] Apple / Google 正式签名流水线入 CI
- [ ] 微信自动化上传 CLI 稳定化
- [ ] 生产 Stripe / 微信商户 webhook 验收
