import { hasPageTemplate, renderPageTemplate } from "@/lib/codegen/template-renderer";

/** B2: KYC 页 — Mustache 真源 */
export async function emitFlutterKYCVerification(): Promise<string> {
  if (await hasPageTemplate("flutter-fintech", "kyc")) {
    return renderPageTemplate("flutter-fintech", "kyc", {});
  }
  throw new Error("kyc.dart.mustache 模板缺失");
}
