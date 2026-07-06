import { getSupabaseAdmin } from "@/lib/supabase";

/**
 * P2: Spec 历史版本管理
 * 列名与 Q5 迁移对齐：version_number（由 DB trigger 自增）
 */

export type SpecVersion = {
  id: string;
  projectId: string;
  version: number;
  spec: Record<string, unknown>;
  createdAt: string;
};

export async function saveSpecVersion(
  projectId: string,
  spec: Record<string, unknown>,
): Promise<void> {
  const supabase = getSupabaseAdmin();

  const { error: insertError } = await supabase
    .from("spec_versions")
    .insert({ project_id: projectId, spec });

  if (insertError) {
    throw new Error(`保存 Spec 版本失败：${insertError.message}`);
  }

  // 保留最近 20 个版本（非原子，但依赖 DB trigger 保证 version_number 唯一）
  const { data: old, error: selectError } = await supabase
    .from("spec_versions")
    .select("id")
    .eq("project_id", projectId)
    .order("version_number", { ascending: false })
    .range(20, 999);

  if (selectError) {
    throw new Error(`清理旧 Spec 版本失败：${selectError.message}`);
  }

  if (old?.length) {
    const { error: deleteError } = await supabase
      .from("spec_versions")
      .delete()
      .in(
        "id",
        old.map((r: { id: string }) => r.id),
      );
    if (deleteError) {
      throw new Error(`删除旧 Spec 版本失败：${deleteError.message}`);
    }
  }
}

export async function listSpecVersions(
  projectId: string,
): Promise<SpecVersion[]> {
  const { data, error } = await getSupabaseAdmin()
    .from("spec_versions")
    .select("id, project_id, version_number, spec, created_at")
    .eq("project_id", projectId)
    .order("version_number", { ascending: false })
    .limit(10);

  if (error) {
    throw new Error(`读取 Spec 版本失败：${error.message}`);
  }

  return (data ?? []).map((r: Record<string, unknown>) => ({
    id: r.id as string,
    projectId: r.project_id as string,
    version: r.version_number as number,
    spec: r.spec as Record<string, unknown>,
    createdAt: r.created_at as string,
  }));
}

export async function restoreSpecVersion(
  projectId: string,
  versionId: string,
): Promise<Record<string, unknown> | null> {
  const { data, error } = await getSupabaseAdmin()
    .from("spec_versions")
    .select("spec")
    .eq("id", versionId)
    .eq("project_id", projectId)
    .maybeSingle();

  if (error) {
    throw new Error(`读取 Spec 版本失败：${error.message}`);
  }
  if (!data) return null;

  const spec = data.spec as Record<string, unknown>;
  const { error: updateError } = await getSupabaseAdmin()
    .from("projects")
    .update({ spec_override: spec, updated_at: new Date().toISOString() })
    .eq("id", projectId);

  if (updateError) {
    throw new Error(`恢复 Spec 版本失败：${updateError.message}`);
  }

  return spec;
}
