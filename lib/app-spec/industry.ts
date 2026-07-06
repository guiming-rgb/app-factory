/**
 * 行业分类 — 共享类型与检测逻辑
 *
 * P3: 关键词/冲突规则外置至 config/industries/detect-rules.json
 */
import { loadDetectRules } from "@/lib/app-spec/industry-detect-rules";

export type IndustryCategory =
  | "finance" | "crm" | "fitness" | "ecommerce" | "education"
  | "social" | "food" | "hotel" | "recruitment" | "property"
  | "video" | "weather" | "sports" | "photo" | "dating"
  | "medical" | "blog" | "game" | "payment" | "generic";

export type IndustryDetectionSource = "metadata" | "keyword" | "generic";

export type IndustryDetectionResult = {
  industry: IndustryCategory;
  confidence: number;
  source: IndustryDetectionSource;
  matchedKeywords?: string[];
};

const CAT_MAP: Record<string, IndustryCategory> = {
  finance: "finance", crm: "crm", fitness: "fitness", ecommerce: "ecommerce",
  education: "education", social: "social", food: "food", hotel: "hotel",
  recruitment: "recruitment", property: "property", video: "video",
  weather: "weather", sports: "sports", photo: "photo", dating: "dating",
  medical: "medical", blog: "blog", game: "game", payment: "payment",
};

function buildBlobs(spec: Record<string, unknown>) {
  const metadata = (spec.metadata ?? {}) as Record<string, unknown>;
  const cat = (metadata?.category as string ?? "").toLowerCase();
  const name = ((spec.displayName as string) ?? "").toLowerCase();
  const appName = ((spec.appName as string) ?? "").toLowerCase();
  const screenIds = ((spec.screens as Array<{ id: string }>) ?? []).map((s) => s.id).join(" ").toLowerCase();
  const hiBlob = [cat, name, appName].join(" ").toLowerCase();
  const fullBlob = [cat, name, appName, screenIds].join(" ").toLowerCase();
  return { cat, hiBlob, fullBlob };
}

function matchBlob(hiBlob: string, fullBlob: string, hiRe: RegExp, fullRe?: RegExp): boolean {
  if (hiRe.test(hiBlob)) return true;
  return (fullRe ?? hiRe).test(fullBlob);
}

function hasMetadataConflict(cat: string, hiBlob: string): boolean {
  const { conflicts } = loadDetectRules();
  for (const { re, industry: conflictCat } of conflicts) {
    if (conflictCat !== cat && re.test(hiBlob)) return true;
  }
  return false;
}

export function detectIndustryWithConfidence(spec: Record<string, unknown>): IndustryDetectionResult {
  const { cat, hiBlob, fullBlob } = buildBlobs(spec);
  const { keywordRules, communityRules } = loadDetectRules();

  if (cat && CAT_MAP[cat] && matchBlob(hiBlob, fullBlob, new RegExp(cat))) {
    if (!hasMetadataConflict(cat, hiBlob)) {
      return {
        industry: CAT_MAP[cat],
        confidence: 0.95,
        source: "metadata",
        matchedKeywords: [cat],
      };
    }
  }

  for (const rule of keywordRules) {
    if (matchBlob(hiBlob, fullBlob, rule.re)) {
      const fromHi = rule.re.test(hiBlob);
      return {
        industry: rule.industry,
        confidence: fromHi ? 0.85 : 0.72,
        source: "keyword",
        matchedKeywords: [rule.label],
      };
    }
  }

  if (/社区/.test(hiBlob) || /社区/.test(fullBlob)) {
    for (const rule of communityRules) {
      if ("re" in rule && rule.re.test(fullBlob)) {
        return { industry: rule.industry, confidence: 0.72, source: "keyword", matchedKeywords: [rule.label] };
      }
    }
    const fallback = communityRules.find((r) => "default" in r);
    if (fallback && "default" in fallback) {
      return { industry: fallback.default, confidence: 0.72, source: "keyword", matchedKeywords: [fallback.label] };
    }
  }

  return { industry: "generic", confidence: 0.5, source: "generic" };
}

export function detectIndustry(spec: Record<string, unknown>): IndustryCategory {
  return detectIndustryWithConfidence(spec).industry;
}
