/**
 * P2 续: 行业配置表 — 19 行业 JSON 真源（config/industries/*.json）
 */
import fs from "fs";
import path from "path";
import type { IndustryCategory } from "@/lib/app-spec/industry";
import { isPilotIndustry } from "./pilot";

export type IndustryEmitConfig = {
  id: IndustryCategory;
  pilot: boolean;
  displayName: string;
  tableName: string;
  primaryColor: string;
  hasImage: boolean;
  serviceName: string;
  templateDir: string;
  entities: string[];
  widgetClasses: string[];
  serviceMethods?: string[];
  /** B3: 可从 JSON 生成的鸿蒙 REST 方法（复杂逻辑仍走 INDUSTRY_METHODS） */
  harmonyMethods?: Array<{
    name: string;
    table: string;
    verb: "GET" | "POST" | "PATCH" | "DELETE" | "RPC";
    path?: string;
    params?: Array<{ name: string; type?: "string" | "number" }>;
    returns?: "array" | "single" | "void";
  }>;
};

const CONFIG_DIR = path.join(process.cwd(), "config", "industries");
const configCache = new Map<string, IndustryEmitConfig>();

function loadIndustryJson(industry: IndustryCategory): IndustryEmitConfig | null {
  if (industry === "generic") return null;
  if (configCache.has(industry)) return configCache.get(industry)!;

  const file = path.join(CONFIG_DIR, `${industry}.json`);
  if (!fs.existsSync(file)) return null;

  try {
    const raw = JSON.parse(fs.readFileSync(file, "utf-8")) as IndustryEmitConfig;
    raw.pilot = isPilotIndustry(industry);
    configCache.set(industry, raw);
    return raw;
  } catch {
    return null;
  }
}

/** 获取行业 emit 配置 */
export function getIndustryEmitConfig(
  industry: IndustryCategory,
): IndustryEmitConfig | null {
  return loadIndustryJson(industry);
}

/** 列出全部 19 行业配置 */
export function listIndustryEmitConfigs(): IndustryEmitConfig[] {
  const ids = listConfiguredIndustryIds();
  return ids.map((id) => getIndustryEmitConfig(id)!).filter(Boolean);
}

/** 扫描 config/industries/*.json（排除 detect-rules） */
export function listConfiguredIndustryIds(): Array<Exclude<IndustryCategory, "generic">> {
  if (!fs.existsSync(CONFIG_DIR)) return [];
  return fs
    .readdirSync(CONFIG_DIR)
    .filter((f) => f.endsWith(".json") && f !== "detect-rules.json")
    .map((f) => f.replace(".json", "") as Exclude<IndustryCategory, "generic">)
    .sort();
}
