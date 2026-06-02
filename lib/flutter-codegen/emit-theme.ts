/**
 * 主题设计系统 — 15 套预设 + 完整设计 Token
 * 消费 Spec.layoutRules，生成 Flutter ThemeData 代码
 */

export type ThemePreset = {
  name: string;
  label: string;
  seedColor: string;
  brightness: "light" | "dark";
  borderRadius: number;
  fontFamily: string;
};

export const THEME_PRESETS: ThemePreset[] = [
  { name: "teal", label: "青绿", seedColor: "0xFF009688", brightness: "light", borderRadius: 8, fontFamily: "" },
  { name: "minimal", label: "极简灰白", seedColor: "0xFF6B7280", brightness: "light", borderRadius: 4, fontFamily: "" },
  { name: "dark", label: "暗夜模式", seedColor: "0xFF1F2937", brightness: "dark", borderRadius: 8, fontFamily: "" },
  { name: "vibrant", label: "活力橙", seedColor: "0xFFFF6B35", brightness: "light", borderRadius: 16, fontFamily: "" },
  { name: "corporate", label: "商务蓝", seedColor: "0xFF2563EB", brightness: "light", borderRadius: 6, fontFamily: "" },
  { name: "playful", label: "俏皮粉", seedColor: "0xFFEC4899", brightness: "light", borderRadius: 20, fontFamily: "" },
  { name: "nature", label: "自然绿", seedColor: "0xFF16A34A", brightness: "light", borderRadius: 12, fontFamily: "" },
  { name: "ocean", label: "海洋蓝", seedColor: "0xFF0284C7", brightness: "light", borderRadius: 14, fontFamily: "" },
  { name: "sunset", label: "日落紫", seedColor: "0xFF7C3AED", brightness: "light", borderRadius: 16, fontFamily: "" },
  { name: "mono", label: "黑白极简", seedColor: "0xFF18181B", brightness: "light", borderRadius: 2, fontFamily: "" },
  { name: "retro", label: "复古棕", seedColor: "0xFF92400E", brightness: "light", borderRadius: 8, fontFamily: "" },
  { name: "neon", label: "霓虹绿", seedColor: "0xFF22C55E", brightness: "dark", borderRadius: 12, fontFamily: "" },
  { name: "pastel", label: "马卡龙", seedColor: "0xFFF9A8D4", brightness: "light", borderRadius: 24, fontFamily: "" },
  { name: "earth", label: "大地色", seedColor: "0xFF78716C", brightness: "light", borderRadius: 8, fontFamily: "" },
  { name: "rose", label: "玫瑰金", seedColor: "0xFFE11D48", brightness: "light", borderRadius: 16, fontFamily: "" },
];

export function resolveTheme(layoutRules: Record<string, unknown> | undefined): ThemePreset {
  const themeName = (layoutRules?.theme as string) || "teal";
  return THEME_PRESETS.find((t) => t.name === themeName) ?? THEME_PRESETS[0];
}

export function emitFlutterTheme(theme: ThemePreset): string {
  const isDark = theme.brightness === "dark";
  const radius = theme.borderRadius;

  return `import "package:flutter/material.dart";

ThemeData createAppTheme() {
  return ThemeData(
    useMaterial3: true,
    colorScheme: ColorScheme.fromSeed(
      seedColor: const Color(${theme.seedColor}),
      brightness: ${isDark ? "Brightness.dark" : "Brightness.light"},
    ),
    ${isDark ? "" : "// light theme extras"}
    cardTheme: CardThemeData(
      elevation: 1,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(${radius})),
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
    ),
    inputDecorationTheme: InputDecorationTheme(
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(${radius})),
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      isDense: true,
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(${radius})),
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
      ),
    ),
    chipTheme: ChipThemeData(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(${radius})),
    ),
    appBarTheme: AppBarTheme(
      centerTitle: false,
      elevation: 0,
      scrolledUnderElevation: 1,
    ),
  );
}
`;
}
