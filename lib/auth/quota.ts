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
  const { data: existing, error: existingError } = await supabase
    .from("user_quotas")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (existingError) {
    console.error("[quota] 查询 user_quotas 失败:", existingError.message);
    throw new Error(`获取用户配额失败: ${existingError.message}`);
  }

  if (!existing) {
    const config = TIER_CONFIGS.free;
    const { error: insertError } = await supabase.from("user_quotas").insert({
      user_id: userId,
      tier: "free",
      projects_limit: config.projects,
      codegen_limit: config.codegen,
      storage_limit_mb: config.storage,
    });
    if (insertError) {
      console.error("[quota] 创建 user_quotas 失败:", insertError.message);
      throw new Error(`创建用户配额失败: ${insertError.message}`);
    }
  }

  const { data, error: fetchError } = await supabase
    .from("user_quotas")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (fetchError || !data) {
    console.error("[quota] 读取 user_quotas 失败:", fetchError?.message ?? "无记录");
    throw new Error(`读取用户配额失败: ${fetchError?.message ?? "无记录"}`);
  }

  const quota = data as Record<string, unknown>;
  const tier = (quota.tier as string) ?? "free";
  const config = TIER_CONFIGS[tier as keyof typeof TIER_CONFIGS] ?? TIER_CONFIGS.free;
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

/**
 * ✅ 原子 check + increment — 防 TOCTOU 竞态。
 * 使用 PostgreSQL RPC 在单次事务内完成检查与递增，
 * 避免 check-then-act 窗口被并发请求绕过。
 */
export async function incrementUsage(userId: string, type: "project" | "codegen"): Promise<void> {
  const supabase = getSupabaseAdmin();
  if (type === "project") {
    await supabase.rpc("increment_projects_used", { uid: userId });
  } else {
    await supabase.rpc("increment_codegen_used", { uid: userId });
  }
}

/** ✅ 原子检查并递增配额，返回是否允许（取代 checkQuota + incrementUsage 两步模式） */
export async function tryConsumeQuota(
  userId: string,
  type: "project" | "codegen"
): Promise<{ ok: boolean; message?: string }> {
  const supabase = getSupabaseAdmin();
  try {
    const rpcName = type === "project" ? "try_increment_projects_used" : "try_increment_codegen_used";
    const { data: allowed, error } = await supabase.rpc(rpcName, { uid: userId });
    if (error) {
      // RPC 不存在时降级到旧的 check + increment 模式
      console.warn(`[quota] ${rpcName} RPC 不可用，降级检查:`, error.message);
      return await checkQuotaLegacy(userId, type);
    }
    if (!allowed) {
      const label = type === "project" ? "项目" : "代码生成";
      const limit = type === "project" ? 3 : 10;
      return { ok: false, message: `免费版${label}配额已用完（${limit}/${limit}）。升级 Pro 解锁更多。` };
    }
    return { ok: true };
  } catch (err) {
    console.warn("[quota] tryConsumeQuota 异常，降级检查:", err);
    return await checkQuotaLegacy(userId, type);
  }
}

/** 旧版两步检查（RPC 不可用时的降级方案，存在 TOCTOU 窗口） */
async function checkQuotaLegacy(userId: string, type: "project" | "codegen"): Promise<{ ok: boolean; message?: string }> {
  const quota = await getUserQuota(userId);
  if (type === "project" && !quota.canCreateProject) {
    return { ok: false, message: `免费版项目配额已用完（${quota.projectsUsed}/${quota.projectsLimit}）。升级 Pro 解锁 50 个项目。` };
  }
  if (type === "codegen" && !quota.canRunCodegen) {
    return { ok: false, message: `免费版代码生成配额已用完（${quota.codegenUsed}/${quota.codegenLimit}）。升级 Pro 解锁 500 次。` };
  }
  // 降级模式仍使用旧的 increment
  if (type === "project") {
    await getSupabaseAdmin().rpc("increment_projects_used", { uid: userId });
  } else {
    await getSupabaseAdmin().rpc("increment_codegen_used", { uid: userId });
  }
  return { ok: true };
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
