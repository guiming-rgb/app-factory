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

export function validateAppSpec(data: unknown): AppSpecValidationResult {
  const validate = getValidator();
  if (validate(data)) {
    return { ok: true, spec: data as AppSpec };
  }
  const errors = (validate.errors ?? []).map(
    (e) => `${e.instancePath || "/"} ${e.message ?? "invalid"}`
  );
  return { ok: false, errors };
}
