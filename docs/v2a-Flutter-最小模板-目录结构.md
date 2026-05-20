# v2a — Flutter 最小模板目录结构

> **状态**：目录与职责**已冻结**（文档）；真实代码落盘目标路径 **`templates/flutter-minimal/`**（下一实现步）。  
> **能力边界**：[模板能力矩阵.md](./模板能力矩阵.md)

---

## 一、模板定位

| 项 | 约定 |
|----|------|
| 名称 | `flutter-minimal` |
| Flutter SDK | **≥ 3.16**（实现时写死 `pubspec` environment） |
| 状态管理 | **Riverpod 2** + `flutter_riverpod`（首版简单，易生成） |
| 路由 | **go_router** |
| 后端 | **supabase_flutter**（与工厂现有 Supabase 一致） |
| 支持界面 | Tab 底栏 + List + Detail + Form（空数据占位可运行） |
| 不支持 | 支付、IM、地图、音视频、复杂动画（见能力矩阵） |

---

## 二、目录树（目标仓库）

```text
templates/flutter-minimal/
├── README.md                 # 模板说明、本地 run 命令、与 Spec 字段对应关系
├── analysis_options.yaml     # flutter_lints
├── pubspec.yaml              # 依赖锁定；Generator 可覆写 name/description
├── .metadata                 # Flutter 创建工程元数据
├── lib/
│   ├── main.dart             # 入口：ProviderScope + MaterialApp.router
│   ├── app.dart              # 主题、locale
│   ├── router/
│   │   └── app_router.dart   # go_router：由 Spec.navigation 生成路由表
│   ├── core/
│   │   ├── config/
│   │   │   └── env.dart      # SUPABASE_URL 等 --dart-define 或 .env 占位
│   │   ├── supabase/
│   │   │   └── supabase_client.dart
│   │   └── widgets/
│   │       ├── app_scaffold.dart
│   │       └── empty_state.dart
│   ├── features/
│   │   └── _template/        # Generator 复制后改名为 features/<screenId>/
│   │       ├── presentation/
│   │       │   ├── list_page.dart
│   │       │   ├── detail_page.dart
│   │       │   └── form_page.dart
│   │       └── providers/
│   │           └── list_provider.dart
│   └── l10n/                   # 可选 v0.1：仅 zh_CN arb 占位
│       └── app_zh.arb
├── test/
│   └── widget_test.dart        #  smoke：App 可 pump
├── android/                    # 标准 Flutter 创建结构（薄封装）
├── ios/
└── tool/
    └── codegen_manifest.json     # 记录 Generator 写入了哪些文件（幂等/重跑）
```

**Generator 规则（规划）**：

1. 复制整棵 `templates/flutter-minimal/` 到临时目录。  
2. 按 Spec `screens[]` 在 `lib/features/<id>/` 生成页面（从 `_template` 克隆替换）。  
3. 重写 `lib/router/app_router.dart` 路由表。  
4.  patch `pubspec.yaml` 的 `name:`、`description:`。  
5. 写入 `lib/core/config/env.dart.example` + README 说明 `--dart-define`。

---

## 三、与 App Spec 字段映射

| Spec 字段 | 模板落点 |
|-----------|----------|
| `appName` | `pubspec.yaml` name（snake_case） |
| `displayName` | `MaterialApp.title`、各 `AppBar` |
| `screens[].type` | `list` → `list_page.dart`；`detail` → `detail_page.dart`；`form` → `form_page.dart` |
| `navigation.tabs` | `app_router.dart` 底部 `StatefulShellRoute` |
| `auth.provider=supabase` | `supabase_client.dart` + 登录占位页（首版可 skip 登录 UI，仅 init） |
| `entities[]` | 首版 **不生成** Freezed 模型；List 用 `Map<String,dynamic>` 占位 |
| `limitations[]` | 生成 `LIMITATIONS.md` 打入 ZIP 根目录 |

---

## 四、本地开发命令（模板维护者 / CI）

```bash
cd templates/flutter-minimal
flutter pub get
dart analyze
flutter test
# 可选：flutter build apk --debug
```

**v2a 验收**（与 [v2a-调研报告.md](./v2a-调研报告.md) 对齐）：`dart analyze` 无 error 为 PoC 过关。

---

## 五、与工厂主站集成（规划）

| 集成点 | 说明 |
|--------|------|
| 下载 | `GET /api/projects/[id]/export-flutter` → ZIP |
| 存储 | Supabase Storage 或本地 `/tmp/codegen/<id>.zip` |
| UI | 项目详情页按钮「下载 Flutter 工程」（**未实现**） |
| 环境变量 | 生成 README 指引用户填入与工厂相同的 Supabase 项目 |

---

## 六、实现立项检查清单

- [ ] 在 `templates/flutter-minimal/` 执行 `flutter create .` 对齐标准结构  
- [ ] 提交模板 baseline 通过 `dart analyze`  
- [ ] Generator PoC：1 个 Spec → 1 个 Tab + 1 个 List  
- [ ] ZIP 打包脚本 `scripts/zip-flutter-artifact.mjs`  
- [ ] 命令组 **G6**（规划）纳入 [命令组-联调与验收.md](./命令组-联调与验收.md)

---

## 七、变更记录

| 日期 | 说明 |
|------|------|
| 2026-05-20 | 初版目录结构冻结 |
