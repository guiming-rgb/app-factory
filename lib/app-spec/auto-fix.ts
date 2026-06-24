/**
 * Q3-M4 (提前启动): Spec 自动修复 Agent
 *
 * 对 LLM 生成的 App Spec 进行自动诊断和修复。
 * 常见错误: 字段缺失、类型错误、关联断裂、缺少必填字段。
 *
 * 修复策略:
 *   - Syntax: JSON 结构校验（通过 AJV schema）
 *   - Semantic: 实体关联、字段类型一致性
 *   - Completeness: 必填字段补全
 */

import type { AppSpec } from "./types";

export interface SpecDiagnosis {
  /** 是否通过所有检查 */
  valid: boolean;
  /** 错误列表 */
  errors: SpecError[];
  /** 警告列表 */
  warnings: SpecWarning[];
  /** 修复后的 Spec（如果可自动修复） */
  fixed?: AppSpec;
  /** 修复统计 */
  fixStats?: {
    autoFixed: number;
    needsManual: number;
    unfixable: number;
  };
}

export interface SpecError {
  type: "syntax" | "semantic" | "completeness";
  path: string;           // JSON path, e.g. "entities[0].fields[2].type"
  message: string;
  fix?: "auto" | "manual" | "unfixable";
}

export interface SpecWarning {
  path: string;
  message: string;
  suggestion?: string;
}

/**
 * 诊断 Spec 并尝试自动修复
 */
export function diagnoseAndFix(spec: unknown): SpecDiagnosis {
  const errors: SpecError[] = [];
  const warnings: SpecWarning[] = [];

  // 确保基本结构
  const s = spec as Record<string, unknown>;
  if (!s || typeof s !== "object") {
    return {
      valid: false,
      errors: [{ type: "syntax", path: "$", message: "Spec is not an object", fix: "unfixable" }],
      warnings: [],
      fixStats: { autoFixed: 0, needsManual: 1, unfixable: 1 },
    };
  }

  // ─── Syntactic fixes ───
  if (!s.specVersion) {
    (s as Record<string, unknown>).specVersion = "0.1.0";
    errors.push({ type: "syntax", path: "$.specVersion", message: "Missing specVersion — auto-set to 0.1.0", fix: "auto" });
  }

  if (!s.appName || typeof s.appName !== "string" || s.appName.trim().length === 0) {
    errors.push({ type: "syntax", path: "$.appName", message: "Missing or empty appName", fix: "manual" });
  }

  if (!s.displayName) {
    (s as Record<string, unknown>).displayName = (s as Record<string, unknown>).appName || "My App";
    errors.push({ type: "syntax", path: "$.displayName", message: "Missing displayName — auto-set to appName", fix: "auto" });
  }

  // ─── Screens validation ───
  const screens = s.screens as Array<Record<string, unknown>> | undefined;
  if (!screens || !Array.isArray(screens) || screens.length === 0) {
    errors.push({ type: "completeness", path: "$.screens", message: "No screens defined — at least 1 required", fix: "manual" });
  } else {
    for (let i = 0; i < screens.length; i++) {
      const screen = screens[i];
      if (!screen.id) {
        screen.id = `screen_${i}`;
        errors.push({ type: "syntax", path: `$.screens[${i}].id`, message: `Missing screen id — auto-set to screen_${i}`, fix: "auto" });
      }
      if (!screen.title) {
        screen.title = screen.id || `Page ${i + 1}`;
        errors.push({ type: "syntax", path: `$.screens[${i}].title`, message: "Missing screen title — auto-set from id", fix: "auto" });
      }
      if (!screen.type) {
        screen.type = "list";
        errors.push({ type: "syntax", path: `$.screens[${i}].type`, message: "Missing screen type — defaulted to list", fix: "auto" });
      }
      // 验证 screen type 合法性
      const validTypes = [
        "list", "detail", "form", "placeholder", "tabRoot",
        "dashboard", "card_grid", "calendar", "chart", "kanban",
        "onboarding", "game", "payment", "chat", "map",
      ];
      if (!validTypes.includes(screen.type as string)) {
        warnings.push({
          path: `$.screens[${i}].type`,
          message: `Unknown screen type: ${screen.type}`,
          suggestion: `Use one of: ${validTypes.join(", ")}`,
        });
      }
    }
  }

  // ─── Entities validation ───
  const entities = s.entities as Array<Record<string, unknown>> | undefined;
  if (entities && Array.isArray(entities)) {
    for (let i = 0; i < entities.length; i++) {
      const entity = entities[i];
      if (!entity.name) {
        entity.name = `entity_${i}`;
        errors.push({ type: "syntax", path: `$.entities[${i}].name`, message: "Missing entity name — auto-set", fix: "auto" });
      }

      const fields = entity.fields as Array<Record<string, unknown>> | undefined;
      if (!fields || !Array.isArray(fields) || fields.length === 0) {
        entity.fields = [{ name: "id", type: "uuid", primary: true }, { name: "title", type: "string" }];
        errors.push({ type: "completeness", path: `$.entities[${i}].fields`, message: "No fields — auto-added id + title", fix: "auto" });
      } else {
        // 确保有主键
        const hasPK = fields.some((f) => f.primary === true);
        if (!hasPK) {
          fields.unshift({ name: "id", type: "uuid", primary: true });
          errors.push({ type: "completeness", path: `$.entities[${i}].fields`, message: "No primary key — auto-added id (uuid)", fix: "auto" });
        }

        for (let j = 0; j < fields.length; j++) {
          const field = fields[j];
          if (!field.name) {
            field.name = `field_${j}`;
            errors.push({ type: "syntax", path: `$.entities[${i}].fields[${j}].name`, message: "Missing field name — auto-set", fix: "auto" });
          }
          if (!field.type) {
            field.type = "string";
            errors.push({ type: "syntax", path: `$.entities[${i}].fields[${j}].type`, message: "Missing field type — defaulted to string", fix: "auto" });
          }
          // 验证 field type
          const validFieldTypes = [
            "uuid", "string", "int", "float", "bool", "boolean",
            "datetime", "date", "json", "image", "file",
          ];
          if (!validFieldTypes.includes(field.type as string)) {
            warnings.push({
              path: `$.entities[${i}].fields[${j}].type`,
              message: `Unknown field type: ${field.type}`,
              suggestion: `Use one of: ${validFieldTypes.join(", ")}`,
            });
          }
        }
      }

      // 验证 entity relations
      const relations = entity.relations as Array<Record<string, unknown>> | undefined;
      if (relations && Array.isArray(relations)) {
        for (let j = 0; j < relations.length; j++) {
          const rel = relations[j];
          if (!rel.target) {
            errors.push({ type: "semantic", path: `$.entities[${i}].relations[${j}]`, message: "Relation missing target entity", fix: "manual" });
          }
          if (!rel.type) {
            rel.type = "belongs_to";
            errors.push({ type: "syntax", path: `$.entities[${i}].relations[${j}].type`, message: "Missing relation type — defaulted to belongs_to", fix: "auto" });
          }
          // 验证 target 引用的 entity 存在
          if (rel.target && entities) {
            const targetExists = entities.some((e: Record<string, unknown>) => e.name === rel.target);
            if (!targetExists) {
              errors.push({
                type: "semantic",
                path: `$.entities[${i}].relations[${j}].target`,
                message: `Relation target "${rel.target}" not found in entities`,
                fix: "manual",
              });
            }
          }
        }
      }
    }
  }

  // ─── Targets validation ───
  if (!s.targets || typeof s.targets !== "object") {
    (s as Record<string, unknown>).targets = {
      flutter: { enabled: true, platforms: ["ios", "android"], formFactors: ["phone"] },
      backend: { provider: "supabase" },
    };
    errors.push({ type: "completeness", path: "$.targets", message: "Missing targets — auto-set to Flutter + Supabase", fix: "auto" });
  }

  // ─── Navigation validation ───
  if (!s.navigation || typeof s.navigation !== "object") {
    (s as Record<string, unknown>).navigation = { tabs: ["home", "profile"] };
    errors.push({ type: "completeness", path: "$.navigation", message: "Missing navigation — auto-set defaults", fix: "auto" });
  }

  // ─── Statistics ───
  const autoFixed = errors.filter((e) => e.fix === "auto").length;
  const needsManual = errors.filter((e) => e.fix === "manual").length;
  const unfixable = errors.filter((e) => e.fix === "unfixable").length;

  return {
    valid: needsManual === 0 && unfixable === 0,
    errors,
    warnings,
    fixed: s as unknown as AppSpec,
    fixStats: { autoFixed, needsManual, unfixable },
  };
}

/**
 * 批量诊断：对多个 Spec 运行诊断
 */
export function batchDiagnose(specs: unknown[]): SpecDiagnosis[] {
  return specs.map((s) => diagnoseAndFix(s));
}
