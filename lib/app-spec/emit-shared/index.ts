export { P2_PILOT_INDUSTRIES, isPilotIndustry, type PilotIndustry } from "./pilot";
export {
  getIndustryEmitConfig,
  listIndustryEmitConfigs,
  listConfiguredIndustryIds,
  type IndustryEmitConfig,
} from "./industry-config";
export { buildWidgetContext } from "./widget-context";
export { buildDashboardPageContext } from "./extended-context";
export {
  buildWechatServiceMap,
  getIndustryServiceName,
  getIndustryServiceMethods,
} from "./service-registry";
