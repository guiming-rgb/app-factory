export type WechatLoginMethod = "wechat" | "phone" | "none";

export type WechatSubPackage = {
  root: string;
  pages: string[];
  name?: string;
};

export type WechatMiniProgramTarget = {
  enabled: boolean;
  tabBar: string[];
  loginMethod: WechatLoginMethod;
  subPackages: WechatSubPackage[];
};

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : {};
}

function normalizeLoginMethod(value: unknown): WechatLoginMethod {
  if (value === "wechat" || value === "phone" || value === "none") {
    return value;
  }
  return "wechat";
}

function normalizeSubPackages(value: unknown): WechatSubPackage[] {
  if (!Array.isArray(value)) return [];
  const out: WechatSubPackage[] = [];
  for (const item of value) {
    const rec = asRecord(item);
    const root = typeof rec.root === "string" ? rec.root.trim() : "";
    const pages = Array.isArray(rec.pages)
      ? rec.pages.filter((p): p is string => typeof p === "string" && !!p.trim())
      : [];
    if (!root || pages.length === 0) continue;
    out.push({
      root: root.replace(/^\/+|\/+$/g, ""),
      pages: pages.map((p) => p.replace(/^\/+/, "")),
      name: typeof rec.name === "string" ? rec.name.trim() : undefined
    });
  }
  return out;
}

function defaultTabBar(
  partialTabBar: unknown,
  minimalTabBar: unknown,
  navigationTabs: string[] | undefined
): string[] {
  if (Array.isArray(partialTabBar)) {
    const ids = partialTabBar.filter(
      (id): id is string => typeof id === "string" && !!id.trim()
    );
    if (ids.length > 0) return ids;
  }
  if (Array.isArray(minimalTabBar)) {
    const ids = minimalTabBar.filter(
      (id): id is string => typeof id === "string" && !!id.trim()
    );
    if (ids.length > 0) return ids;
  }
  if (navigationTabs && navigationTabs.length > 0) {
    return [...navigationTabs];
  }
  return ["main_list", "profile"];
}

/** 补齐 targets.wechatMiniProgram（阶段 C 完整 Spec） */
export function normalizeWechatMiniProgramTarget(
  partialWechat: unknown,
  minimalWechat: unknown,
  navigationTabs?: string[]
): WechatMiniProgramTarget {
  const partial = asRecord(partialWechat);
  const minimal = asRecord(minimalWechat);
  const enabled = partial.enabled !== false && minimal.enabled !== false;

  return {
    enabled,
    tabBar: defaultTabBar(
      partial.tabBar,
      minimal.tabBar,
      navigationTabs
    ),
    loginMethod: normalizeLoginMethod(
      partial.loginMethod ?? minimal.loginMethod
    ),
    subPackages: normalizeSubPackages(
      partial.subPackages ?? minimal.subPackages
    )
  };
}
