/**
 * P3: detectIndustry 规则外置 — config/industries/detect-rules.json
 */
import fs from "fs";
import path from "path";
import type { IndustryCategory } from "@/lib/app-spec/industry";

export type DetectRulesFile = {
  version: number;
  conflicts: Array<{ pattern: string; industry: IndustryCategory }>;
  keywordRules: Array<{ pattern: string; industry: IndustryCategory; label: string }>;
  communityRules: Array<
    | { pattern: string; industry: IndustryCategory; label: string }
    | { default: IndustryCategory; label: string }
  >;
};

export type CompiledDetectRules = {
  conflicts: Array<{ re: RegExp; industry: IndustryCategory }>;
  keywordRules: Array<{ re: RegExp; industry: IndustryCategory; label: string }>;
  communityRules: Array<
    | { re: RegExp; industry: IndustryCategory; label: string }
    | { default: IndustryCategory; label: string }
  >;
};

const RULES_PATH = path.join(process.cwd(), "config", "industries", "detect-rules.json");
let cached: CompiledDetectRules | null = null;

export function loadDetectRules(): CompiledDetectRules {
  if (cached) return cached;
  const raw = JSON.parse(fs.readFileSync(RULES_PATH, "utf-8")) as DetectRulesFile;
  cached = {
    conflicts: raw.conflicts.map((c) => ({ re: new RegExp(c.pattern), industry: c.industry })),
    keywordRules: raw.keywordRules.map((k) => ({
      re: new RegExp(k.pattern),
      industry: k.industry,
      label: k.label,
    })),
    communityRules: raw.communityRules.map((r) =>
      "default" in r
        ? { default: r.default, label: r.label }
        : { re: new RegExp(r.pattern), industry: r.industry, label: r.label },
    ),
  };
  return cached;
}

/** 测试用：清除缓存 */
export function clearDetectRulesCache(): void {
  cached = null;
}
