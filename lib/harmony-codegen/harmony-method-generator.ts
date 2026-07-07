/**
 * Phase2 B3: 从行业 JSON serviceMethods 生成鸿蒙 REST 方法体片段
 * 复杂逻辑仍保留在 emit-industry-services.ts INDUSTRY_METHODS 直至全量迁移
 */

export type HarmonyMethodParam = {
  name: string;
  type?: "string" | "number";
};

export type HarmonyMethodDef = {
  name: string;
  table: string;
  verb: "GET" | "POST" | "PATCH" | "DELETE" | "RPC";
  path?: string;
  /** GET 路径占位符 {{paramName}} 对应的参数列表 */
  params?: HarmonyMethodParam[];
  returns?: "array" | "single" | "void";
};

function normalizePath(path: string): string {
  if (!path) return "";
  return path.startsWith("?") ? path : "?" + path;
}

function buildRestPathTemplate(table: string, path: string): string {
  return `${table}${normalizePath(path)}`;
}

function buildRestFetchArg(table: string, path: string, params?: HarmonyMethodParam[]): string {
  const template = buildRestPathTemplate(table, path);
  if (!params?.length || !template.includes("{{")) {
    return JSON.stringify(template);
  }
  const regex = /\{\{(\w+)\}\}/g;
  const segments: string[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(template)) !== null) {
    if (m.index > last) {
      segments.push(JSON.stringify(template.slice(last, m.index)));
    }
    segments.push(m[1]);
    last = m.index + m[0].length;
  }
  if (last < template.length) {
    segments.push(JSON.stringify(template.slice(last)));
  }
  return segments.join(" + ");
}

function buildParamSignature(params?: HarmonyMethodParam[]): string {
  if (!params?.length) return "";
  return params
    .map((p) => `${p.name}: ${p.type === "number" ? "number" : "string"}`)
    .join(", ");
}

/** 从配置生成简单 CRUD 风格方法体（供新行业或回归测试） */
export function generateSimpleHarmonyMethod(def: HarmonyMethodDef): string {
  const { name, table, verb, path = "", returns = "array", params } = def;
  const sig = buildParamSignature(params);
  const argList = sig ? `(${sig})` : "()";

  if (verb === "GET" && returns === "array") {
    const fetchArg = buildRestFetchArg(table, path, params);
    return `
  ${name}: ${argList}: Promise<Array<Record<string, Object>> | null> => restFetch(${fetchArg}),`;
  }
  if (verb === "POST") {
    return `
  ${name}: (data: Record<string, Object>): Promise<Record<string, Object> | null> =>
    restFetch("${table}", { method: "POST", extraData: data }),`;
  }
  const fetchArg = buildRestFetchArg(table, path, params);
  return `
  ${name}: ${argList}: Promise<Array<Record<string, Object>> | null> => restFetch(${fetchArg}),`;
}

/** 从行业 JSON harmonyMethods 生成方法体片段 */
export function generateHarmonyMethodsFromConfig(
  harmonyMethods: HarmonyMethodDef[] | undefined,
): string {
  return (harmonyMethods ?? []).map(generateSimpleHarmonyMethod).join("");
}
