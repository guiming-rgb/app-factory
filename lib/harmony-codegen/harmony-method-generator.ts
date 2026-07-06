/**
 * Phase2 B3: 从行业 JSON serviceMethods 生成鸿蒙 REST 方法体片段
 * 复杂逻辑仍保留在 emit-industry-services.ts INDUSTRY_METHODS 直至全量迁移
 */

export type HarmonyMethodDef = {
  name: string;
  table: string;
  verb: "GET" | "POST" | "PATCH" | "DELETE" | "RPC";
  path?: string;
  returns?: "array" | "single" | "void";
};

/** 从配置生成简单 CRUD 风格方法体（供新行业或回归测试） */
export function generateSimpleHarmonyMethod(def: HarmonyMethodDef): string {
  const { name, table, verb, path = "", returns = "array" } = def;
  const restPath = `${table}${path ? (path.startsWith("?") ? path : "?" + path) : ""}`;

  if (verb === "GET" && returns === "array") {
    return `
  ${name}: (): Promise<Array<Record<string, Object>> | null> => restFetch("${restPath}"),`;
  }
  if (verb === "POST") {
    return `
  ${name}: (data: Record<string, Object>): Promise<Record<string, Object> | null> =>
    restFetch("${table}", { method: "POST", extraData: data }),`;
  }
  return `
  ${name}: (): Promise<Array<Record<string, Object>> | null> => restFetch("${restPath}"),`;
}

/** 从行业 JSON harmonyMethods 生成方法体片段 */
export function generateHarmonyMethodsFromConfig(
  harmonyMethods: HarmonyMethodDef[] | undefined,
): string {
  return (harmonyMethods ?? []).map(generateSimpleHarmonyMethod).join("");
}
