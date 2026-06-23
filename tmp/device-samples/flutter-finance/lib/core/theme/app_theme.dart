import "package:flutter/material.dart";

ThemeData createAppTheme() {
  return ThemeData(
    useMaterial3: true,
    colorScheme: ColorScheme.fromSeed(
      seedColor: const Color(0xFF009688),
      brightness: Brightness.light,
    ),
    // light theme extras
    cardTheme: CardThemeData(
      elevation: 1,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
    ),
    inputDecorationTheme: InputDecorationTheme(
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      isDense: true,
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
      ),
    ),
    chipTheme: ChipThemeData(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
    ),
    appBarTheme: AppBarTheme(
      centerTitle: false,
      elevation: 0,
      scrolledUnderElevation: 1,
    ),
  );
}

/// 设计 Token — 行业模板与扩展页共用
class AppTheme {
  AppTheme._();

  static const double spaceXs = 4;
  static const double spaceSm = 8;
  static const double spaceMd = 16;
  static const double spaceLg = 24;
  static const double spaceXl = 32;

  static const double radiusSm = 8;
  static const double radiusMd = 12;
  static const double radiusLg = 16;
  static const double radiusXl = 24;

  static TextStyle headingLarge(TextTheme text) =>
      text.headlineSmall?.copyWith(fontWeight: FontWeight.bold) ?? const TextStyle();
  static TextStyle headingMedium(TextTheme text) =>
      text.titleLarge?.copyWith(fontWeight: FontWeight.w600) ?? const TextStyle();
  static TextStyle bodyText(TextTheme text) =>
      text.bodyMedium?.copyWith(height: 1.6) ?? const TextStyle();
  static TextStyle caption(TextTheme text) =>
      text.bodySmall?.copyWith(color: text.bodySmall?.color?.withValues(alpha: 0.6)) ??
      const TextStyle();
}
