import type { AppSpec, AppSpecScreen } from "./types";
import { parseEntities } from "./entity-scaffold";

/**
 * P3: 三平台共享的列表页判断逻辑
 * 替换各平台硬编码的 screen ID 匹配
 */

/**
 * 判断一个 screen 是否为列表页（应生成带实体绑定的列表）
 */
export function isListScreen(
  screen: AppSpecScreen,
  spec: AppSpec
): boolean {
  // 直接 type === "list"
  if (screen.type === "list") return true;

  // 有 entity 绑定
  if (screen.entity) return true;

  // 检查是否存在同名实体
  const entities = parseEntities(spec);
  if (
    entities.some(
      (e) => e.name.toLowerCase() === screen.id.toLowerCase()
    )
  ) {
    return true;
  }

  // 常见列表页 ID 模式（保留兼容）
  const LIST_IDS = new Set([
    "match_list",
    "main_list",
    "todo_list",
    "task_list",
    "item_list",
    "product_list",
    "order_list",
    "user_list"
  ]);
  if (LIST_IDS.has(screen.id)) return true;

  return false;
}

/**
 * 判断一个 screen 是否为实体详情页
 */
export function isDetailScreen(
  screen: AppSpecScreen,
  _spec: AppSpec
): boolean {
  return screen.type === "detail";
}

/**
 * 从 Spec 中获取首个列表 screen（兼容现有 code）
 */
export function findFirstListScreen(
  spec: AppSpec
): AppSpecScreen | undefined {
  // 优先按 type
  const byType = spec.screens.find((s) => s.type === "list");
  if (byType) return byType;

  // 回退到有实体绑定的
  const byEntity = spec.screens.find(
    (s) => s.entity && s.type !== "tabRoot"
  );
  if (byEntity) return byEntity;

  // 回退到 isListScreen
  return spec.screens.find(
    (s) => isListScreen(s, spec) && s.type !== "tabRoot"
  );
}
