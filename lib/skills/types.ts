/**
 * P2: 技能代码生成插件化 — 类型定义
 */

/** 代码生成片段 */
export type SkillCodegenSnippet = {
  /** 目标平台 */
  platform: "flutter" | "wechat" | "harmony";
  /** 注入目标：pubspec.yaml | 页面文件 | 路由文件 */
  target: "pubspec.yaml" | "page" | "router" | "component";
  /** 代码模板内容 */
  template: string;
  /** 注入位置 */
  placement: "append" | "prepend" | "replace";
  /** 可选：替换时的目标标识（如文件中的标记注释） */
  marker?: string;
};
