import { hasPageTemplate, renderPageTemplate } from "@/lib/codegen/template-renderer";

/** B2: 保险页 — Mustache 真源 */
export async function emitFlutterInsuranceClaims(): Promise<string> {
  if (await hasPageTemplate("flutter-fintech", "insurance")) {
    return renderPageTemplate("flutter-fintech", "insurance", {});
  }
  throw new Error("insurance.dart.mustache 模板缺失");
}
