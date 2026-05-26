import type { AppSpec } from "./types";

const TAB_ELIGIBLE_TYPES = new Set(["list", "placeholder", "detail"]);

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : {};
}

/** 将 navigation.tabs 规整为存在的、适合做 Tab 的 screen id */
export function normalizeSpecNavigation(
  screens: AppSpec["screens"],
  navigation: unknown,
  minimal: AppSpec
): AppSpec["navigation"] {
  const nav = asRecord(navigation);
  const byId = new Map(screens.map((s) => [s.id, s]));

  const isTabEligible = (id: string) => {
    const screen = byId.get(id);
    return !!screen && TAB_ELIGIBLE_TYPES.has(screen.type);
  };

  let tabs = Array.isArray(nav.tabs)
    ? nav.tabs
        .map((item) => String(item ?? "").trim())
        .filter((id) => byId.has(id))
    : [];

  tabs = tabs.filter(isTabEligible);

  if (tabs.length < 2) {
    for (const screen of screens) {
      if (!TAB_ELIGIBLE_TYPES.has(screen.type)) {
        continue;
      }
      if (!tabs.includes(screen.id)) {
        tabs.push(screen.id);
      }
      if (tabs.length >= 2) {
        break;
      }
    }
  }

  if (tabs.length < 2) {
    tabs = [...(minimal.navigation?.tabs ?? [])];
  }

  return {
    ...asRecord(minimal.navigation),
    ...nav,
    tabs
  };
}
