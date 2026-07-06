/**
 * 银行级支付 + 保险 模板
 * 依赖：Stripe Connect / Plaid / 保险精算 API
 */
export {
  esc,
  emitFlutterBankingPayment,
  emitFlutterInsuranceClaims,
  emitFlutterKYCVerification,
  emitFintechDDL,
} from "./emit-fintech/index";
