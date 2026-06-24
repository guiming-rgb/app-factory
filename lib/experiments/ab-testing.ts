/**
 * A/B 测试框架 SDK。
 *
 * 基于 Supabase 持久化实验配置、用户分配和事件追踪。
 * 使用确定性哈希分配确保同一用户始终看到同一变体。
 *
 * @module ab-testing
 */

import { getSupabaseAdmin } from "@/lib/supabase";
import { createHash } from "node:crypto";

// ──────────────────────────────────────────────
// 类型定义
// ──────────────────────────────────────────────

export type ExperimentStatus = "draft" | "running" | "paused" | "completed";

export interface Experiment {
  id: string;
  name: string;
  description: string | null;
  variants: string[];
  trafficAllocation: number;
  startAt: string | null;
  endAt: string | null;
  status: ExperimentStatus;
  createdAt: string;
}

export interface ExperimentAssignment {
  experimentId: string;
  variant: string;
  userId: string;
}

export interface ExperimentConfig {
  name: string;
  description?: string;
  variants: string[];
  trafficAllocation?: number;
  startAt?: string;
  endAt?: string;
}

export interface TrackEventParams {
  experimentId: string;
  userId: string;
  eventName: string;
  properties?: Record<string, unknown>;
}

export interface VariantResult {
  name: string;
  users: number;
  conversions: number;
  conversionRate: number;
}

export interface ExperimentResults {
  variants: VariantResult[];
  confidence: number;
  winner: string | null;
}

// ──────────────────────────────────────────────
// 核心函数
// ──────────────────────────────────────────────

/**
 * 通过 MD5 哈希 + 取模实现确定性变体分配。
 * 同一 experimentId + userId 永远返回相同变体。
 */
function hashAssign(userId: string, experimentId: string, variantCount: number): number {
  const hash = createHash("md5").update(`${userId}:${experimentId}`).digest("hex");
  const hashInt = Number.parseInt(hash.slice(0, 8), 16);
  return hashInt % variantCount;
}

/**
 * 创建新实验。
 * 将实验配置写入 Supabase experiments 表。
 */
export async function createExperiment(config: ExperimentConfig): Promise<Experiment> {
  if (!config.name?.trim()) {
    throw new Error("实验名称不能为空");
  }
  if (!config.variants || config.variants.length < 2) {
    throw new Error("至少需要 2 个变体");
  }
  const uniqueVariants = new Set(config.variants);
  if (uniqueVariants.size !== config.variants.length) {
    throw new Error("变体名称不能重复");
  }

  const trafficAllocation = config.trafficAllocation ?? 1.0;
  if (trafficAllocation <= 0 || trafficAllocation > 1) {
    throw new Error("trafficAllocation 必须在 0 到 1 之间");
  }

  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("experiments")
    .insert({
      name: config.name.trim(),
      description: config.description?.trim() ?? null,
      variants: config.variants,
      traffic_allocation: trafficAllocation,
      start_at: config.startAt ?? null,
      end_at: config.endAt ?? null,
      status: "draft",
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(`创建实验失败：${error.message}`);
  }

  return mapExperimentRow(data);
}

/**
 * 获取单个实验详情。
 */
export async function getExperiment(id: string): Promise<Experiment | null> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("experiments")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null;
    }
    throw new Error(`查询实验失败：${error.message}`);
  }

  return mapExperimentRow(data);
}

/**
 * 获取实验列表，可选项按状态过滤。
 */
export async function listExperiments(status?: ExperimentStatus): Promise<Experiment[]> {
  const supabase = getSupabaseAdmin();

  let query = supabase.from("experiments").select("*").order("created_at", { ascending: false });

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`获取实验列表失败：${error.message}`);
  }

  return (data ?? []).map(mapExperimentRow);
}

/**
 * 为用户分配实验变体。
 * 使用确定性哈希，确保同一用户始终分配到同一变体。
 * 首次分配后写入 experiment_assignments 表持久化。
 */
export async function assignUser(experimentId: string, userId: string): Promise<string> {
  const supabase = getSupabaseAdmin();

  // 1. 检查是否已有分配记录
  const { data: existing } = await supabase
    .from("experiment_assignments")
    .select("variant")
    .eq("experiment_id", experimentId)
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) {
    return existing.variant;
  }

  // 2. 查询实验配置
  const experiment = await getExperiment(experimentId);
  if (!experiment) {
    throw new Error(`实验不存在：${experimentId}`);
  }
  if (experiment.status !== "running") {
    throw new Error(`实验状态不是 running，当前状态：${experiment.status}`);
  }

  // 3. 流量分配：hash 落在 [0, 100) 区间
  const bucket = hashAssign(userId, experimentId, 100);
  const threshold = Math.round(experiment.trafficAllocation * 100);

  // 如果超出分配的流量比例，仍分配一个变体（但不算入实验）
  // 分配逻辑始终进行，写入数据库
  const variantIndex = bucket % experiment.variants.length;
  const variant = experiment.variants[variantIndex];

  // 4. 持久化分配记录
  const { error: insertError } = await supabase.from("experiment_assignments").insert({
    experiment_id: experimentId,
    user_id: userId,
    variant,
  });

  if (insertError) {
    // 唯一约束冲突 → 并发写入，读取已存在的记录
    const { data: retry } = await supabase
      .from("experiment_assignments")
      .select("variant")
      .eq("experiment_id", experimentId)
      .eq("user_id", userId)
      .maybeSingle();

    if (retry) {
      return retry.variant;
    }
    throw new Error(`分配变体失败：${insertError.message}`);
  }

  return variant;
}

/**
 * 记录实验事件（转化、点击、浏览等）。
 */
export async function trackExperimentEvent(
  experimentId: string,
  userId: string,
  eventName: string,
  properties?: Record<string, unknown>
): Promise<void> {
  const supabase = getSupabaseAdmin();

  // 获取该用户在此实验中的分配变体
  const { data: assignment } = await supabase
    .from("experiment_assignments")
    .select("variant")
    .eq("experiment_id", experimentId)
    .eq("user_id", userId)
    .maybeSingle();

  const variant = assignment?.variant ?? "unknown";

  const { error } = await supabase.from("experiment_events").insert({
    experiment_id: experimentId,
    user_id: userId,
    variant,
    event_name: eventName,
    properties: properties ?? {},
  });

  if (error) {
    throw new Error(`记录事件失败：${error.message}`);
  }
}

/**
 * 获取实验结果统计。
 *
 * 计算：
 * - 每个变体的用户数、转化数、转化率
 * - 通过 Z-test 计算置信度（仅双变体实验）
 * - 指出获胜变体（置信度 >95% 时）
 */
export async function getExperimentResults(
  experimentId: string
): Promise<ExperimentResults> {
  const supabase = getSupabaseAdmin();

  // 1. 获取实验
  const experiment = await getExperiment(experimentId);
  if (!experiment) {
    throw new Error(`实验不存在：${experimentId}`);
  }

  // 2. 通过 RPC 获取各变体用户数聚合
  const { data: assignCounts, error: countErr } = await supabase.rpc(
    "get_experiment_variant_counts",
    { p_experiment_id: experimentId }
  );

  let variantUserCounts: Record<string, number> = {};
  if (countErr || !assignCounts) {
    // fallback: 逐变体查询
    for (const v of experiment.variants) {
      const { count, error: cErr } = await supabase
        .from("experiment_assignments")
        .select("*", { count: "exact", head: true })
        .eq("experiment_id", experimentId)
        .eq("variant", v);

      if (!cErr && count != null) {
        variantUserCounts[v] = count;
      }
    }
  } else {
    for (const row of assignCounts as Array<{ variant: string; cnt: number }>) {
      variantUserCounts[row.variant] = row.cnt;
    }
  }

  // 3. 获取每个变体的转化事件数（event_name 为 'conversion' 的事件）
  let variantConversionCounts: Record<string, number> = {};
  for (const v of experiment.variants) {
    const { count, error: cErr } = await supabase
      .from("experiment_events")
      .select("*", { count: "exact", head: true })
      .eq("experiment_id", experimentId)
      .eq("variant", v)
      .eq("event_name", "conversion");

    if (!cErr && count != null) {
      variantConversionCounts[v] = count;
    }
  }

  // 4. 组装结果
  const variants: VariantResult[] = experiment.variants.map((name) => {
    const users = variantUserCounts[name] ?? 0;
    const conversions = variantConversionCounts[name] ?? 0;
    return {
      name,
      users,
      conversions,
      conversionRate: users > 0 ? conversions / users : 0,
    };
  });

  // 5. 简单 Z-test（仅双变体实验有意义）
  let confidence = 0;
  let winner: string | null = null;

  if (variants.length === 2) {
    const [a, b] = variants;
    if (a.users > 0 && b.users > 0 && a.conversions > 0 && b.conversions > 0) {
      const pA = a.conversionRate;
      const pB = b.conversionRate;
      const nA = a.users;
      const nB = b.users;
      const pPool = (a.conversions + b.conversions) / (nA + nB);
      const se = Math.sqrt(pPool * (1 - pPool) * (1 / nA + 1 / nB));

      if (se > 0) {
        const z = Math.abs(pA - pB) / se;
        // 近似正态分布累积分布函数（CDF）
        confidence = normalCdf(z) * 100;

        if (confidence > 95) {
          winner = pA > pB ? a.name : b.name;
        }
      }
    }
  }

  return {
    variants,
    confidence: Math.round(confidence * 100) / 100,
    winner,
  };
}

/**
 * 暂停实验。
 */
export async function pauseExperiment(id: string): Promise<void> {
  const supabase = getSupabaseAdmin();

  const { error } = await supabase
    .from("experiments")
    .update({ status: "paused" })
    .eq("id", id)
    .eq("status", "running");

  if (error) {
    throw new Error(`暂停实验失败：${error.message}`);
  }
}

/**
 * 完成实验。
 */
export async function completeExperiment(id: string): Promise<void> {
  const supabase = getSupabaseAdmin();

  const { error } = await supabase
    .from("experiments")
    .update({
      status: "completed",
      end_at: new Date().toISOString(),
    })
    .eq("id", id)
    .in("status", ["running", "paused"]);

  if (error) {
    throw new Error(`完成实验失败：${error.message}`);
  }
}

/**
 * 更新实验配置。
 */
export async function updateExperiment(
  id: string,
  updates: Partial<ExperimentConfig & { status: ExperimentStatus }>
): Promise<Experiment> {
  const supabase = getSupabaseAdmin();

  const payload: Record<string, unknown> = {};
  if (updates.name !== undefined) payload.name = updates.name.trim();
  if (updates.description !== undefined) payload.description = updates.description?.trim() ?? null;
  if (updates.variants !== undefined) {
    if (updates.variants.length < 2) {
      throw new Error("至少需要 2 个变体");
    }
    payload.variants = updates.variants;
  }
  if (updates.trafficAllocation !== undefined) {
    if (updates.trafficAllocation <= 0 || updates.trafficAllocation > 1) {
      throw new Error("trafficAllocation 必须在 0 到 1 之间");
    }
    payload.traffic_allocation = updates.trafficAllocation;
  }
  if (updates.startAt !== undefined) payload.start_at = updates.startAt;
  if (updates.endAt !== undefined) payload.end_at = updates.endAt;
  if (updates.status !== undefined) {
    const validStatuses: ExperimentStatus[] = ["draft", "running", "paused", "completed"];
    if (!validStatuses.includes(updates.status)) {
      throw new Error(`无效状态：${updates.status}`);
    }
    payload.status = updates.status;
  }

  if (Object.keys(payload).length === 0) {
    throw new Error("没有要更新的字段");
  }

  const { data, error } = await supabase
    .from("experiments")
    .update(payload)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw new Error(`更新实验失败：${error.message}`);
  }

  return mapExperimentRow(data);
}

// ──────────────────────────────────────────────
// 内部工具
// ──────────────────────────────────────────────

/**
 * 将数据库行映射为 Experiment 对象（snake_case → camelCase）。
 */
function mapExperimentRow(row: Record<string, unknown>): Experiment {
  return {
    id: row.id as string,
    name: row.name as string,
    description: (row.description as string) ?? null,
    variants: row.variants as string[],
    trafficAllocation: row.traffic_allocation as number,
    startAt: (row.start_at as string) ?? null,
    endAt: (row.end_at as string) ?? null,
    status: row.status as ExperimentStatus,
    createdAt: row.created_at as string,
  };
}

/**
 * 近似标准正态分布 CDF（误差函数法）。
 * 用于 Z-test 的 p-value 计算。
 * 精度优于 1e-7。
 */
function normalCdf(x: number): number {
  // 使用 Horner 法求有理逼近
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x) / Math.sqrt(2);

  const t = 1 / (1 + p * x);
  const y = 1 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

  return 0.5 * (1 + sign * y);
}
