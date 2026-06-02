import type { AppSpec, AppSpecScreen } from "@/lib/app-spec/types";
import { resolveEntityForScreen } from "@/lib/app-spec/entity-scaffold";
import { resolveCodegenScreens } from "@/lib/app-spec/resolve-codegen-screens";
import { resolveTabScreens } from "@/lib/app-spec/resolve-tabs";
import { isListScreen } from "@/lib/app-spec/resolve-list-screen";

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : {};
}

function readWechatSubPackages(spec: AppSpec): Array<{
  root: string;
  pages: string[];
  name?: string;
}> {
  const targets = asRecord(spec.targets);
  const wechat = asRecord(targets.wechatMiniProgram);
  if (!Array.isArray(wechat.subPackages)) return [];
  const out: Array<{ root: string; pages: string[]; name?: string }> = [];
  for (const item of wechat.subPackages) {
    const rec = asRecord(item);
    const root = typeof rec.root === "string" ? rec.root.trim() : "";
    const pages = Array.isArray(rec.pages)
      ? rec.pages.filter((p): p is string => typeof p === "string" && !!p.trim())
      : [];
    if (!root || pages.length === 0) continue;
    out.push({
      root,
      pages,
      name: typeof rec.name === "string" ? rec.name : undefined
    });
  }
  return out;
}

const PROFILE_TAB_ID = "profile";
const LIST_PAGE_IDS = new Set([
  "match_list",
  "main_list",
  "index",
  "home",
  "todo_list",
  "task_list"
]);

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
  for (const screen of resolveCodegenScreens(spec)) {
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

  const subPackages = readWechatSubPackages(spec);
  const subPackageBlock =
    subPackages.length > 0
      ? {
          subPackages: subPackages.map((pkg) => ({
            root: pkg.root,
            pages: pkg.pages,
            ...(pkg.name ? { name: pkg.name } : {})
          }))
        }
      : {};

  return {
    ...base,
    pages,
    window,
    tabBar,
    ...subPackageBlock
  };
}

/** P3: 使用共享 isListScreen 逻辑 */
export function listScreenFromSpec(spec: AppSpec): AppSpecScreen | undefined {
  const byType = spec.screens.find((s) => s.type === "list");
  if (byType) return byType;
  // 回退到共享 isListScreen 判断（替代硬编码 LIST_PAGE_IDS）
  return spec.screens.find(
    (s) => isListScreen(s, spec) && s.type !== "tabRoot"
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

export function emitGeneratedPageWxml(
  screen: AppSpecScreen,
  spec?: AppSpec
): string {
  const title = screen.title.replace(/</g, "");
  const safeId = screen.id.replace(/</g, "");
  if (spec) {
    const entity = resolveEntityForScreen(spec, screen);
    if (entity && screen.type === "detail") {
      const fields = entity.fields
        .slice(0, 6)
        .map((f) => `<view class="muted">${f.name}: ${f.type}</view>`)
        .join("\n      ");
      return `<view class="page">
  <view class="card">
    <view class="todo-title">${title}</view>
    <view class="muted">${entity.name} 详情 · Spec 字段</view>
  </view>
  <view class="card">
    ${fields}
    <view class="muted">接 Backend 后可绑定真实数据</view>
  </view>
</view>
`;
    }
  }
  return `<view class="page">
  <view class="card">
    <view class="empty">${title} — 占位（App Spec: ${safeId}）</view>
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
