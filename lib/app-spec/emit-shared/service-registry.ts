/**
 * P2 续: 三栈行业服务注册表 — 从 JSON 配置派生
 */
import type { IndustryCategory } from "@/lib/app-spec/industry";
import { getIndustryEmitConfig, listConfiguredIndustryIds } from "./industry-config";

/** 微信 industry.js 服务名映射（由 config 派生） */
export function buildWechatServiceMap(): Record<
  Exclude<IndustryCategory, "generic">,
  string
> {
  const out = {} as Record<Exclude<IndustryCategory, "generic">, string>;
  for (const id of listConfiguredIndustryIds()) {
    const cfg = getIndustryEmitConfig(id);
    if (cfg?.serviceName) out[id] = cfg.serviceName;
  }
  return out;
}

export function getIndustryServiceName(
  industry: IndustryCategory,
): string | null {
  if (industry === "generic") return null;
  return getIndustryEmitConfig(industry)?.serviceName ?? null;
}

export function getIndustryServiceMethods(
  industry: IndustryCategory,
): string[] {
  return getIndustryEmitConfig(industry)?.serviceMethods ?? [];
}
