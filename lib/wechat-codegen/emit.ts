import type { AppSpec, AppSpecScreen } from "@/lib/app-spec/types";
import { resolveTabScreens } from "@/lib/app-spec/resolve-tabs";

const PROFILE_TAB_ID = "profile";
const LIST_PAGE_IDS = new Set(["match_list", "main_list", "index", "home"]);

export function wechatPagePath(screenId: string): string {
  if (screenId === PROFILE_TAB_ID) return "pages/profile/profile";
  if (LIST_PAGE_IDS.has(screenId)) return "pages/index/index";
  const safe = screenId.replace(/[^a-z0-9_]/gi, "_").toLowerCase() || "page";
  return `pages/${safe}/${safe}`;
}

export function tabIconPaths(screenId: string): {
  iconPath: string;
  selectedIconPath: string;
} {
  if (screenId === PROFILE_TAB_ID) {
    return {
      iconPath: "assets/icons/tab-profile.png",
      selectedIconPath: "assets/icons/tab-profile-active.png"
    };
  }
  return {
    iconPath: "assets/icons/tab-home.png",
    selectedIconPath: "assets/icons/tab-home-active.png"
  };
}

export function buildAppJson(
  spec: AppSpec,
  base: Record<string, unknown>
): Record<string, unknown> {
  const tabs = resolveTabScreens(spec);
  const pagePathSet = new Set<string>(["pages/index/index", "pages/profile/profile"]);
  for (const screen of tabs) {
    pagePathSet.add(wechatPagePath(screen.id));
  }
  const pages = [...pagePathSet].sort((a, b) => {
    if (a === "pages/index/index") return -1;
    if (b === "pages/index/index") return 1;
    if (a === "pages/profile/profile") return -1;
    if (b === "pages/profile/profile") return 1;
    return a.localeCompare(b);
  });

  const window = {
    ...(base.window as Record<string, unknown>),
    navigationBarTitleText: spec.displayName
  };

  const tabBar = {
    ...(base.tabBar as Record<string, unknown>),
    list: tabs.map((screen) => ({
      pagePath: wechatPagePath(screen.id),
      text: screen.title,
      ...tabIconPaths(screen.id)
    }))
  };

  return {
    ...base,
    pages,
    window,
    tabBar
  };
}

export function listScreenFromSpec(spec: AppSpec): AppSpecScreen | undefined {
  return spec.screens.find(
    (s) => LIST_PAGE_IDS.has(s.id) || s.type === "list"
  );
}

export function patchIndexWxml(content: string, title: string): string {
  const safe = title.replace(/</g, "").slice(0, 80);
  return content.replace(
    /<view class="empty">[^<]*<\/view>/,
    `<view class="empty">${safe} — 列表占位（App Spec 生成）</view>`
  );
}

export function patchIndexJsonTitle(
  content: string,
  title: string
): string {
  const json = JSON.parse(content) as Record<string, unknown>;
  json.navigationBarTitleText = title;
  return JSON.stringify(json, null, 2) + "\n";
}

export function patchProjectConfigName(
  content: string,
  appName: string,
  displayName: string
): string {
  const json = JSON.parse(content) as Record<string, unknown>;
  json.projectname = appName.slice(0, 40);
  json.description = `${displayName} — App 生产工厂生成（v2b）`;
  return JSON.stringify(json, null, 2) + "\n";
}

export function emitGeneratedPageWxml(screen: AppSpecScreen): string {
  const title = screen.title.replace(/</g, "");
  return `<view class="page">
  <view class="card">
    <view class="empty">${title} — 占位（App Spec: ${screen.id}）</view>
  </view>
</view>
`;
}

export function emitGeneratedPageJs(): string {
  return "Page({});\n";
}

export function emitGeneratedPageJson(screen: AppSpecScreen): string {
  return (
    JSON.stringify({ navigationBarTitleText: screen.title }, null, 2) + "\n"
  );
}
