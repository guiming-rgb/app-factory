import type { AppSpec, AppSpecScreen } from "./types";
import { resolveTabScreens } from "./resolve-tabs";

const MAX_SCREENS = 8;

/** Codegen 多平台共用的 Spec→Screen 列表（Tab 优先 + 额外业务页） */
export function resolveCodegenScreens(spec: AppSpec): AppSpecScreen[] {
  const tabs = resolveTabScreens(spec);
  const seen = new Set(tabs.map((s) => s.id));
  const merged: AppSpecScreen[] = [...tabs];

  for (const screen of spec.screens ?? []) {
    if (merged.length >= MAX_SCREENS) break;
    if (seen.has(screen.id)) continue;
    if (screen.type === "tabRoot" || screen.id === "home") continue;
    merged.push(screen);
    seen.add(screen.id);
  }

  return merged;
}

export function countCodegenScreens(spec: AppSpec): number {
  return resolveCodegenScreens(spec).length;
}
