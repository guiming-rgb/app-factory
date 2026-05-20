/**
 * App Spec JSON Schema 校验（v2a-实现-2）
 * 用法：npm run validate:spec
 *       npm run validate:spec -- docs/schemas/examples/valid-minimal.json
 */
import fs from "fs";
import path from "path";
import Ajv from "ajv";
import addFormats from "ajv-formats";

const root = process.cwd();
const schemaPath = path.join(root, "docs/schemas/app-spec-v0.1.schema.json");
const defaultExamples = [
  "docs/schemas/examples/valid-minimal.json"
];

function loadJson(filePath) {
  const full = path.isAbsolute(filePath) ? filePath : path.join(root, filePath);
  return JSON.parse(fs.readFileSync(full, "utf8"));
}

function validateOne(validate, filePath) {
  const data = loadJson(filePath);
  const valid = validate(data);
  if (valid) {
    console.log(`✅ ${filePath}`);
    return true;
  }
  console.error(`❌ ${filePath}`);
  for (const err of validate.errors ?? []) {
    console.error(`   ${err.instancePath || "/"} ${err.message}`);
  }
  return false;
}

function main() {
  const schema = loadJson(schemaPath);
  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);
  const validate = ajv.compile(schema);

  const args = process.argv.slice(2).filter((a) => !a.startsWith("-"));
  const targets = args.length > 0 ? args : defaultExamples;

  console.log("══ App Spec Validator ══\n");
  let ok = 0;
  for (const t of targets) {
    if (validateOne(validate, t)) ok += 1;
  }

  console.log(`\n${ok}/${targets.length} 通过`);
  if (ok !== targets.length) {
    process.exit(1);
  }
  console.log("✅ validate:spec 全部通过");
}

main();
