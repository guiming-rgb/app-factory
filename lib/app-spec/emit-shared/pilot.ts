/**
 * Mustache 模板化行业 — 19 行业全量（Phase2 B1）
 * 门禁全绿后 pilot 标志与 JSON 配置同步为 true。
 */
import type { IndustryCategory } from "@/lib/app-spec/industry";

export const P2_PILOT_INDUSTRIES = [
  "finance",
  "crm",
  "fitness",
  "ecommerce",
  "education",
  "social",
  "food",
  "hotel",
  "recruitment",
  "property",
  "video",
  "weather",
  "sports",
  "photo",
  "dating",
  "medical",
  "blog",
  "game",
  "payment",
] as const satisfies readonly IndustryCategory[];

export type PilotIndustry = (typeof P2_PILOT_INDUSTRIES)[number];

export function isPilotIndustry(
  industry: IndustryCategory,
): industry is PilotIndustry {
  return (P2_PILOT_INDUSTRIES as readonly string[]).includes(industry);
}
