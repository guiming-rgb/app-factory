import type { AppSpec } from "./types";

export type SpecQualityReport = {
  score: number;
  warnings: string[];
};

/** Codegen 前 Spec 质量探针（C 阶段增强） */
export function assessSpecQuality(spec: AppSpec): SpecQualityReport {
  const warnings: string[] = [];
  let score = 100;

  const screens = spec.screens ?? [];
  const tabs = spec.navigation?.tabs ?? [];

  if (screens.length < 2) {
    warnings.push("screens 少于 2 个，Tab/列表页可能过于单薄");
    score -= 15;
  }

  if (tabs.length === 0 && screens.some((s) => s.type === "tabRoot")) {
    warnings.push("存在 tabRoot 但 navigation.tabs 为空");
    score -= 10;
  }

  for (const tabId of tabs) {
    if (!screens.some((s) => s.id === tabId)) {
      warnings.push(`navigation.tabs 引用未知 screen: ${tabId}`);
      score -= 8;
    }
  }

  const screenIds = new Set(screens.map((s) => s.id));
  for (const screen of screens) {
    if (screen.type === "list" && !(spec.entities?.length ?? 0)) {
      warnings.push(
        `列表页 ${screen.id} 无 entities，将使用合成列表示例（非纯占位）`
      );
      score -= 3;
    }
    if (screen.children?.length) {
      for (const childId of screen.children) {
        if (!screenIds.has(childId)) {
          warnings.push(`screen ${screen.id} 引用未知子页 ${childId}`);
          score -= 6;
        }
      }
    }
  }

  const tabRoots = screens.filter((s) => s.type === "tabRoot");
  if (tabRoots.length > 1) {
    warnings.push("存在多个 tabRoot，导航映射可能冲突");
    score -= 8;
  }

  if (spec.complianceFlags?.templateLimited) {
    warnings.push("Spec 标记 templateLimited，部分能力需人工开发");
    score -= 5;
  }

  const wechat = spec.targets?.wechatMiniProgram as
    | { enabled?: boolean }
    | undefined;
  if (wechat?.enabled && !tabs.length) {
    warnings.push("小程序已启用但无 tabBar 配置");
    score -= 12;
  }

  const harmony = spec.targets?.harmony as { enabled?: boolean } | undefined;
  if (harmony?.enabled && !spec.appName?.match(/^[a-z][a-z0-9_]*$/)) {
    warnings.push("鸿蒙 bundle 名 appName 建议使用 snake_case");
    score -= 5;
  }

  return {
    score: Math.max(0, Math.min(100, score)),
    warnings: warnings.slice(0, 8)
  };
}
