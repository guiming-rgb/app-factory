import type { AppSpec, AppSpecScreen } from "./types";

const PROFILE_TAB_ID = "profile";

export function resolveTabScreens(spec: AppSpec): AppSpecScreen[] {
  const screens = spec.screens ?? [];
  const byId = new Map(screens.map((s) => [s.id, s]));
  const tabIds = [...(spec.navigation?.tabs ?? [])];
  if (!tabIds.includes(PROFILE_TAB_ID)) {
    tabIds.push(PROFILE_TAB_ID);
  }
  return tabIds.map(
    (id) =>
      byId.get(id) ?? {
        id,
        title: id === PROFILE_TAB_ID ? "我的" : id,
        type: id === PROFILE_TAB_ID ? "placeholder" : "list"
      }
  );
}
