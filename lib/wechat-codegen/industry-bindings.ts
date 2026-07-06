import type { IndustryCategory } from "@/lib/app-spec/industry";
import { buildWechatServiceMap } from "@/lib/app-spec/emit-shared/service-registry";

/** 与 templates/wechat-miniprogram-minimal/services/industry.js 导出一致（P2 续：由 JSON 配置派生） */
export const WECHAT_INDUSTRY_SERVICES: Record<
  Exclude<IndustryCategory, "generic">,
  string
> = buildWechatServiceMap();

export function wechatIndustryServiceName(
  industry: IndustryCategory
): string | null {
  if (industry === "generic") return null;
  return WECHAT_INDUSTRY_SERVICES[industry] ?? null;
}

/** 页面 JS 顶部的 industry 服务 require */
export function wechatIndustryRequireLine(industry: IndustryCategory): string {
  const name = wechatIndustryServiceName(industry);
  if (!name) return "";
  return `const { ${name} } = require("../../services/industry");\n`;
}

/** list()/load 使用行业服务或回退 REST */
export function wechatIndustryListCall(
  industry: IndustryCategory,
  table: string
): string {
  const name = wechatIndustryServiceName(industry);
  if (!name) {
    return `request("${table}?select=*&limit=\${PAGE_SIZE}&offset=\${from}&order=created_at.desc")`;
  }
  return `${name}.list()`;
}

/** 扩展页 async fetch 表达式 */
export function wechatIndustryFetchExpr(
  industry: IndustryCategory,
  fallback: string
): string {
  const name = wechatIndustryServiceName(industry);
  if (!name) return fallback;
  return `${name}.list()`;
}
