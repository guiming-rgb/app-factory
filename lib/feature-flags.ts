/**
 * B-3: Feature Flags — 按用户/项目/比例灰度发布
 */

type FlagRule = {
  /** 0-100 百分比灰度（0=全关，100=全开） */
  rollout?: number;
  /** 白名单用户 ID */
  userIds?: string[];
  /** 白名单项目 ID */
  projectIds?: string[];
};

const FLAGS: Record<string, FlagRule> = {
  "codegen_parallel": { rollout: 100 },            // 并行代码生成（已全量）
  "spec_editor_v2": { rollout: 100 },              // Spec 编辑器 v2
  "backend_api_generation": { rollout: 80 },       // 后端 API 生成
  "ai_fix_analyze": { rollout: 50 },               // AI 代码修复
  "template_library": { rollout: 100 },            // 模板库
  "stripe_billing": { rollout: 0, userIds: [] },   // Stripe 计费（待配置）
  "email_notifications": { rollout: 0, userIds: [] }, // 邮件通知（待配置 API key）
};

export function isFeatureEnabled(flag: string, context?: { userId?: string; projectId?: string }): boolean {
  const rule = FLAGS[flag];
  if (!rule) return false;

  // 白名单优先
  if (rule.userIds?.length && context?.userId && rule.userIds.includes(context.userId)) return true;
  if (rule.projectIds?.length && context?.projectId && rule.projectIds.includes(context.projectId)) return true;

  // 百分比灰度
  if (typeof rule.rollout === "number") {
    if (rule.rollout >= 100) return true;
    if (rule.rollout <= 0) return false;
    // 基于用户 ID 哈希的确定性灰度
    const hash = (context?.userId ?? "anon").split("").reduce((s, c) => s + c.charCodeAt(0), 0);
    return (hash % 100) < rule.rollout;
  }

  return false;
}

export function getEnabledFlags(context?: { userId?: string; projectId?: string }): string[] {
  return Object.keys(FLAGS).filter((f) => isFeatureEnabled(f, context));
}
