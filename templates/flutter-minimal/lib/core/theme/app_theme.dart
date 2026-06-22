import "package:flutter/material.dart";

/// App 生产工厂 — 设计系统
/// 所有生成的 App 统一使用此主题系统，由 Spec layoutRules.theme 驱动

class AppTheme {
  AppTheme._();

  static const _primaryMap = {
    "teal": Color(0xFF0D9488),
    "blue": Color(0xFF2563EB),
    "green": Color(0xFF16A34A),
    "red": Color(0xFFDC2626),
    "orange": Color(0xFFEA580C),
    "purple": Color(0xFF7C3AED),
    "pink": Color(0xFFDB2777),
    "indigo": Color(0xFF4F46E5),
    "cyan": Color(0xFF0891B2),
    "amber": Color(0xFFD97706),
  };

  static Color primaryFromName(String? name) =>
      _primaryMap[name?.toLowerCase() ?? "teal"] ?? _primaryMap["teal"]!;

  // 间距系统
  static const double spaceXs = 4;
  static const double spaceSm = 8;
  static const double spaceMd = 16;
  static const double spaceLg = 24;
  static const double spaceXl = 32;

  // 圆角
  static const double radiusSm = 8;
  static const double radiusMd = 12;
  static const double radiusLg = 16;
  static const double radiusXl = 24;

  // 阴影
  static List<BoxShadow> cardShadow(ColorScheme colors) => [
        BoxShadow(
          color: colors.shadow.withValues(alpha: 0.06),
          blurRadius: 12,
          offset: const Offset(0, 2),
        ),
      ];

  // 文字层级
  static TextStyle headingLarge(TextTheme text) =>
      text.headlineSmall?.copyWith(fontWeight: FontWeight.bold) ?? const TextStyle();
  static TextStyle headingMedium(TextTheme text) =>
      text.titleLarge?.copyWith(fontWeight: FontWeight.w600) ?? const TextStyle();
  static TextStyle bodyText(TextTheme text) =>
      text.bodyMedium?.copyWith(height: 1.6) ?? const TextStyle();
  static TextStyle caption(TextTheme text) =>
      text.bodySmall?.copyWith(color: text.bodySmall?.color?.withValues(alpha: 0.6)) ?? const TextStyle();

  static ThemeData build(Color primary) {
    final colorScheme = ColorScheme.fromSeed(
      seedColor: primary,
      brightness: Brightness.light,
    );
    return ThemeData(
      colorScheme: colorScheme,
      useMaterial3: true,
      appBarTheme: AppBarTheme(
        backgroundColor: colorScheme.surface,
        foregroundColor: colorScheme.onSurface,
        elevation: 0,
        scrolledUnderElevation: 1,
        centerTitle: false,
        titleTextStyle: TextStyle(
          color: colorScheme.onSurface,
          fontSize: 18,
          fontWeight: FontWeight.w600,
        ),
      ),
      cardTheme: CardThemeData(
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(radiusMd),
        ),
        margin: const EdgeInsets.symmetric(horizontal: spaceMd, vertical: spaceSm),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: colorScheme.surfaceContainerHighest.withValues(alpha: 0.3),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(radiusSm),
          borderSide: BorderSide.none,
        ),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: colorScheme.primary,
          foregroundColor: colorScheme.onPrimary,
          elevation: 0,
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(radiusSm),
          ),
        ),
      ),
    );
  }
}
