import { getSupabaseAdmin } from "@/lib/supabase";

/**
 * 方向 B-1：用量配额管理
 */

export type QuotaInfo = {
  tier: "free" | "pro" | "enterprise";
  projectsLimit: number;
  projectsUsed: number;
  codegenLimit: number;
  codegenUsed: number;
  resetDate: string;
  canCreateProject: boolean;
  canRunCodegen: boolean;
};

const TIER_CONFIGS = {
  free: { projects: 3, codegen: 10, storage: 100 },
  pro: { projects: 50, codegen: 500, storage: 5000 },
  enterprise: { projects: 999, codegen: 9999, storage: 50000 },
};

export async function getUserQuota(userId: string): Promise<QuotaInfo> {
  const supabase = getSupabaseAdmin();

  // 获取或创建配额记录
  const { data: existing } = await supabase
    .from("user_quotas")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (!existing) {
    const config = TIER_CONFIGS.free;
    await supabase.from("user_quotas").insert({
      user_id: userId,
      tier: "free",
      projects_limit: config.projects,
      codegen_limit: config.codegen,
      storage_limit_mb: config.storage,
    });
  }

  const { data } = await supabase
    .from("user_quotas")
    .select("*")
    .eq("user_id", userId)
    .single();

  const quota = data as Record<string, unknown> | null;
  const tier = (quota?.tier as string) ?? "free";
  const config = TIER_CONFIGS[tier as keyof typeof TIER_CONFIGS];
  const projectsUsed = (quota?.projects_used as number) ?? 0;
  const codegenUsed = (quota?.codegen_used as number) ?? 0;

  return {
    tier: tier as QuotaInfo["tier"],
    projectsLimit: config.projects,
    projectsUsed,
    codegenLimit: config.codegen,
    codegenUsed,
    resetDate: (quota?.reset_date as string) ?? "",
    canCreateProject: projectsUsed < config.projects || tier !== "free",
    canRunCodegen: codegenUsed < config.codegen || tier !== "free",
  };
}

export async function incrementUsage(userId: string, type: "project" | "codegen"): Promise<void> {
  const supabase = getSupabaseAdmin();
  if (type === "project") {
    await supabase.rpc("increment_projects_used", { uid: userId });
  } else {
    await supabase.rpc("increment_codegen_used", { uid: userId });
  }
}

export async function checkQuota(userId: string, type: "project" | "codegen"): Promise<{ ok: boolean; message?: string }> {
  const quota = await getUserQuota(userId);
  if (type === "project" && !quota.canCreateProject) {
    return { ok: false, message: `免费版项目配额已用完（${quota.projectsUsed}/${quota.projectsLimit}）。升级 Pro 解锁 50 个项目。` };
  }
  if (type === "codegen" && !quota.canRunCodegen) {
    return { ok: false, message: `免费版代码生成配额已用完（${quota.codegenUsed}/${quota.codegenLimit}）。升级 Pro 解锁 500 次。` };
  }
  return { ok: true };
}
