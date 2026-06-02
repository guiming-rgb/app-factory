import { getSupabaseAdmin } from "@/lib/supabase";

/**
 * P1: 代码生成缓存层
 * 同一 Spec 内容重复生成时跳过 LLM，直接复用上次结果
 * 缓存键 = hash(spec内容) + 平台
 */

type CacheEntry = {
  specHash: string;
  target: string;
  runId: string;
  artifactPath: string;
  createdAt: string;
};

/** 简单的字符串哈希（FNV-1a） */
function hashString(str: string): string {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16);
}

function specFingerprint(spec: Record<string, unknown>): string {
  // 只对影响代码生成的关键字段做哈希
  const key = JSON.stringify({
    screens: spec.screens,
    entities: spec.entities,
    navigation: (spec as Record<string, unknown>).navigation,
    layoutRules: (spec as Record<string, unknown>).layoutRules,
    appName: (spec as Record<string, unknown>).appName,
    displayName: (spec as Record<string, unknown>).displayName,
  });
  return hashString(key);
}

export async function findCachedCodegenRun(
  spec: Record<string, unknown>,
  target: string,
  projectId: string
): Promise<CacheEntry | null> {
  try {
    const fingerprint = specFingerprint(spec);
    const { data } = await getSupabaseAdmin()
      .from("codegen_runs")
      .select("id, artifact_path, metadata, created_at")
      .eq("project_id", projectId)
      .eq("target", target)
      .eq("status", "completed")
      .order("created_at", { ascending: false })
      .limit(3);

    for (const row of (data ?? [])) {
      const meta = row.metadata as Record<string, unknown> | null;
      if (meta?.specFingerprint === fingerprint) {
        // 验证产物文件还存在
        try {
          const { artifactExists } = await import("@/lib/codegen/artifacts");
          if (await artifactExists(row.artifact_path as string)) {
            return {
              specHash: fingerprint,
              target,
              runId: row.id as string,
              artifactPath: row.artifact_path as string,
              createdAt: row.created_at as string,
            };
          }
        } catch {
          continue;
        }
      }
    }
    return null;
  } catch {
    return null;
  }
}

export { specFingerprint };
