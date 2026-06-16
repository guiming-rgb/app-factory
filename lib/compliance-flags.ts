/**
 * 合规标志类型 — AppSpec.complianceFlags 的结构化定义
 *
 * 由安全与合规顾问 Agent 生成，经 report-to-spec 提取进入 Spec，
 * 代码生成器据此决定是否生成 HIPAA 合规页、PCI-DSS 支付安全提示等。
 */

export type ComplianceFlag = {
  /** 是否受模板能力限制（而非定制开发） */
  templateLimited?: boolean;
  /** 受监管的业务行业 */
  regulatedIndustry?: "medical" | "fintech" | "insurance" | "social" | "ecommerce" | "none";
  /** 安全合规风险等级 */
  riskLevel?: "low" | "medium" | "high" | "critical";
  /** 是否需要 HIPAA（美国健康保险流通与责任法案）合规 */
  requiresHIPAA?: boolean;
  /** 是否需要 PCI-DSS（支付卡行业数据安全标准）合规 */
  requiresPCIDSS?: boolean;
  /** 是否需要 KYC（了解你的客户）/ AML（反洗钱）合规 */
  requiresKYC?: boolean;
  /** 是否需要 GDPR（欧盟通用数据保护条例）合规 */
  requiresGDPR?: boolean;
  /** 是否需要中国《个人信息保护法》合规 */
  requiresPIPL?: boolean;
  /** 是否需要用户同意页面 */
  requiresConsentScreen?: boolean;
  /** 是否需要数据删除 API */
  requiresDataDeletionAPI?: boolean;
  /** 是否需要数据本地化存储 */
  requiresDataLocalization?: boolean;
  /** 是否需要操作审计日志 */
  requiresAuditLog?: boolean;
  /** 可逐项验收的合规检查清单 */
  checklist?: string[];
};

/**
 * 从 AppSpec 的 complianceFlags 中安全读取 ComplianceFlag
 */
export function getComplianceFlags(spec: {
  complianceFlags?: Record<string, unknown>;
}): ComplianceFlag {
  const raw = spec.complianceFlags;
  if (!raw || typeof raw !== "object") return {};
  return raw as ComplianceFlag;
}

/**
 * 判断是否需要生成隐私/合规页面（包括同意页、数据删除 API 等）
 */
export function needsComplianceFeatures(flags: ComplianceFlag): boolean {
  return Boolean(
    flags.requiresConsentScreen ||
    flags.requiresHIPAA ||
    flags.requiresPCIDSS ||
    flags.requiresGDPR ||
    flags.requiresPIPL ||
    flags.requiresDataDeletionAPI ||
    flags.requiresAuditLog
  );
}

/**
 * 判断是否属于强监管行业
 */
export function isRegulatedIndustry(flags: ComplianceFlag): boolean {
  return (
    flags.regulatedIndustry !== undefined &&
    flags.regulatedIndustry !== "none" &&
    flags.regulatedIndustry !== "ecommerce"
  );
}

/**
 * 生成代码中需要的合规导入/依赖列表
 */
export function getComplianceDependencies(flags: ComplianceFlag): string[] {
  const deps: string[] = [];
  // 目前 compliance 页面只依赖 flutter/material.dart，无需额外 package
  return deps;
}
