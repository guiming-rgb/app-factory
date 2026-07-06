import fs from "fs";
import path from "path";
import Ajv, { type ValidateFunction } from "ajv";
import addFormats from "ajv-formats";

import type { AppSpec } from "./types";

let cachedValidate: ValidateFunction | null = null;

function getValidator(): ValidateFunction {
  if (cachedValidate) return cachedValidate;
  const schemaPath = path.join(
    process.cwd(),
    "docs/schemas/app-spec-v0.1.schema.json"
  );
  const schema = JSON.parse(fs.readFileSync(schemaPath, "utf8"));
  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);
  cachedValidate = ajv.compile(schema);
  return cachedValidate;
}

export type AppSpecValidationResult =
  | { ok: true; spec: AppSpec }
  | { ok: false; errors: string[] };

/** P2: JSON Schema 之外的语义校验（页面 ID 唯一、导航引用有效等） */
export function validateAppSpecSemantics(spec: AppSpec): string[] {
  const errors: string[] = [];

  if (!spec.appName?.trim()) {
    errors.push("appName 不能为空");
  } else if (!/^[a-z][a-z0-9_]*$/i.test(spec.appName.trim())) {
    errors.push("appName 须为字母开头的 slug（字母数字下划线）");
  }

  if (!spec.displayName?.trim()) {
    errors.push("displayName 不能为空");
  }

  if (!Array.isArray(spec.screens) || spec.screens.length === 0) {
    errors.push("screens 至少需要一个页面");
    return errors;
  }

  const screenIds = new Set<string>();
  for (const screen of spec.screens) {
    if (!screen.id?.trim()) {
      errors.push("screen.id 不能为空");
      continue;
    }
    if (screenIds.has(screen.id)) {
      errors.push(`screen.id 重复: ${screen.id}`);
    }
    screenIds.add(screen.id);
  }

  for (const screen of spec.screens) {
    for (const childId of screen.children ?? []) {
      if (typeof childId === "string" && childId && !screenIds.has(childId)) {
        errors.push(
          `screen ${screen.id} 的 children 引用未知页面: ${childId}`,
        );
      }
    }
  }

  for (const tab of spec.navigation?.tabs ?? []) {
    if (typeof tab === "string" && tab && !screenIds.has(tab)) {
      errors.push(`navigation.tabs 引用未知 screen: ${tab}`);
    }
  }

  return errors;
}

export function validateAppSpec(data: unknown): AppSpecValidationResult {
  const validate = getValidator();
  if (!validate(data)) {
    const errors = (validate.errors ?? []).map(
      (e) => `${e.instancePath || "/"} ${e.message ?? "invalid"}`,
    );
    return { ok: false, errors };
  }

  const spec = data as AppSpec;
  const semanticErrors = validateAppSpecSemantics(spec);
  if (semanticErrors.length > 0) {
    return { ok: false, errors: semanticErrors };
  }

  return { ok: true, spec };
}
