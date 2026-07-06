import { hasPageTemplate, renderPageTemplate } from "@/lib/codegen/template-renderer";

/** B2: 银行支付页 — Mustache 真源 */
export async function emitFlutterBankingPayment(): Promise<string> {
  if (await hasPageTemplate("flutter-fintech", "banking-payment")) {
    return renderPageTemplate("flutter-fintech", "banking-payment", {});
  }
  throw new Error("banking-payment.dart.mustache 模板缺失");
}
