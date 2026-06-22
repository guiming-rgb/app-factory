import type { AppSpec } from "./types";

const SCREEN_TYPES = new Set([
  "tabRoot",
  "list",
  "detail",
  "form",
  "placeholder",
  "dashboard",
  "card_grid",
  "calendar",
  "chart",
  "kanban",
  "onboarding",
  "map",
  "chat",
  "call",
  "payment",
  "iot",
  "game",
  "ar",
  "medical",
  "automotive",
  "banking",
  "insurance",
  "kyc"
]);

/** LLM 常把 id 或页面语义误填为 type */
const INVALID_TYPE_TOKENS = new Set([
  "home",
  "main",
  "list",
  "page",
  "profile",
  "detail",
  "form",
  "tab",
  "root",
  "tabroot",
  "placeholder",
  "screen",
  "index",
  "menu"
]);

function slugScreenId(raw: unknown, fallback: string): string {
  if (typeof raw === "string") {
    const slug = raw
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_]+/g, "_")
      .replace(/^_+|_+$/g, "");
    if (/^[a-z][a-z0-9_]*$/.test(slug)) return slug.slice(0, 48);
  }
  return fallback;
}

function inferScreenType(
  screenId: string,
  rawType: unknown,
  fallbackType: AppSpec["screens"][number]["type"]
): AppSpec["screens"][number]["type"] {
  if (typeof rawType === "string" && SCREEN_TYPES.has(rawType)) {
    return rawType as AppSpec["screens"][number]["type"];
  }

  const token =
    typeof rawType === "string" ? rawType.trim().toLowerCase() : "";

  if (token === screenId || INVALID_TYPE_TOKENS.has(token) || !token) {
    if (
      screenId === "home" ||
      token === "home" ||
      token === "main" ||
      token === "tab" ||
      token === "root" ||
      token === "tabroot"
    ) {
      return "tabRoot";
    }
    if (screenId === "profile" || token === "profile") {
      return "placeholder";
    }
    if (
      screenId.includes("list") ||
      token === "list" ||
      token === "page" ||
      token === "index" ||
      token === "menu"
    ) {
      return "list";
    }
    if (screenId.includes("detail") || token === "detail") {
      return "detail";
    }
    if (screenId.includes("form") || token === "form") {
      return "form";
    }
    // 新扩展类型推断
    if (screenId.includes("dashboard") || screenId.includes("stat") || screenId.includes("overview") || token === "dashboard") {
      return "dashboard";
    }
    if (screenId.includes("grid") || screenId.includes("gallery") || screenId.includes("card") || token === "card_grid") {
      return "card_grid";
    }
    if (screenId.includes("calendar") || screenId.includes("schedule") || token === "calendar") {
      return "calendar";
    }
    if (screenId.includes("chart") || screenId.includes("report") || screenId.includes("analysis") || token === "chart") {
      return "chart";
    }
    if (screenId.includes("kanban") || screenId.includes("board") || screenId.includes("pipeline") || token === "kanban") {
      return "kanban";
    }
    if (screenId.includes("onboarding") || screenId.includes("welcome") || screenId.includes("tutorial") || token === "onboarding") {
      return "onboarding";
    }
  }

  return fallbackType;
}

function normalizeOneScreen(
  raw: unknown,
  index: number,
  minimalScreens: AppSpec["screens"]
): AppSpec["screens"][number] {
  const fallback =
    minimalScreens[index] ?? minimalScreens[minimalScreens.length - 1];
  const obj =
    typeof raw === "object" && raw !== null
      ? (raw as Record<string, unknown>)
      : {};

  const typeRaw = obj.type;
  const screenId = slugScreenId(obj.id, fallback.id);
  const type = inferScreenType(screenId, typeRaw, fallback.type);

  const screen: AppSpec["screens"][number] = {
    id: screenId,
    title:
      typeof obj.title === "string" && obj.title.trim()
        ? obj.title.trim().slice(0, 128)
        : fallback.title,
    type
  };

  if (Array.isArray(obj.children)) {
    const children = obj.children.filter((c) => typeof c === "string") as string[];
    if (children.length) screen.children = children;
  } else if (fallback.children?.length) {
    screen.children = [...fallback.children];
  }

  if (typeof obj.entity === "string" && obj.entity.trim()) {
    screen.entity = obj.entity.trim();
  } else if (fallback.entity) {
    screen.entity = fallback.entity;
  }

  return screen;
}

/** 将 LLM 输出的 screens 规整为可过 Schema 的结构 */
export function normalizeSpecScreens(
  screens: unknown,
  minimal: AppSpec
): AppSpec["screens"] {
  const minimalScreens = minimal.screens;
  if (!Array.isArray(screens) || screens.length === 0) {
    return minimalScreens;
  }

  const normalized = screens.map((raw, i) =>
    normalizeOneScreen(raw, i, minimalScreens)
  );

  if (normalized.length < 3) {
    const ids = new Set(normalized.map((s) => s.id));
    for (const fallback of minimalScreens) {
      if (normalized.length >= 3) break;
      if (!ids.has(fallback.id)) {
        normalized.push({ ...fallback });
        ids.add(fallback.id);
      }
    }
  }

  return normalized.length >= 3 ? normalized : minimalScreens;
}
