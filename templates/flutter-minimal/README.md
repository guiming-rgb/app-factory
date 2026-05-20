# Flutter 最小模板（app_factory_minimal）

> App 生产工厂 **MVP v2a** 固定骨架。配套：[v2a-Flutter-最小模板-目录结构.md](../../docs/v2a-Flutter-最小模板-目录结构.md)

## 本地运行

```bash
cd templates/flutter-minimal
flutter pub get
dart analyze
flutter test
```

## Supabase（可选）

构建时传入（与工厂 `.env.local` 对齐）：

```bash
flutter run \
  --dart-define=SUPABASE_URL=https://YOUR_PROJECT.supabase.co \
  --dart-define=SUPABASE_ANON_KEY=your_anon_key
```

未配置时使用占位 UI，仍可 `dart analyze` 通过。

## Generator

复制本目录 → 按 App Spec 生成 `lib/features/*` 与 `lib/router/app_router.dart`。
