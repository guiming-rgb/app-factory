import type { AppSpec, AppSpecScreen } from "./types";

const PROFILE_TAB_ID = "profile";

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : {};
}

export function resolveTabScreens(spec: AppSpec): AppSpecScreen[] {
  const tabIds = resolveWechatTabIds(spec);
  const screens = spec.screens ?? [];
  const byId = new Map(screens.map((s) => [s.id, s]));
  return tabIds.map(
    (id) =>
      byId.get(id) ?? {
        id,
        title: id === PROFILE_TAB_ID ? "我的" : id,
        type: id === PROFILE_TAB_ID ? "placeholder" : "list"
      }
  );
}

/** 小程序 Tab 顺序：优先 wechatMiniProgram.tabBar，否则 navigation.tabs */
export function resolveWechatTabIds(spec: AppSpec): string[] {
  const targets = asRecord(spec.targets);
  const wechat = asRecord(targets.wechatMiniProgram);
  const fromWechat = Array.isArray(wechat.tabBar)
    ? wechat.tabBar.filter((id): id is string => typeof id === "string" && !!id.trim())
    : [];

  const tabIds =
    fromWechat.length > 0 ? [...fromWechat] : [...(spec.navigation?.tabs ?? [])];

  if (!tabIds.includes(PROFILE_TAB_ID)) {
    tabIds.push(PROFILE_TAB_ID);
  }
  return tabIds;
}
