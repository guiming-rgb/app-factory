import { getSupabaseAdmin } from "@/lib/supabase";

/**
 * P2: Spec 历史版本管理
 */

export type SpecVersion = {
  id: string;
  projectId: string;
  version: number;
  spec: Record<string, unknown>;
  createdAt: string;
};

export async function saveSpecVersion(projectId: string, spec: Record<string, unknown>): Promise<void> {
  const { data: latest } = await getSupabaseAdmin()
    .from("spec_versions")
    .select("version")
    .eq("project_id", projectId)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextVersion = (latest?.version ?? 0) + 1;

  await getSupabaseAdmin()
    .from("spec_versions")
    .insert({ project_id: projectId, version: nextVersion, spec });

  // Keep max 20 versions
  const { data: old } = await getSupabaseAdmin()
    .from("spec_versions")
    .select("id")
    .eq("project_id", projectId)
    .order("version", { ascending: false })
    .range(20, 999);

  if (old?.length) {
    await getSupabaseAdmin()
      .from("spec_versions")
      .delete()
      .in("id", old.map((r: { id: string }) => r.id));
  }
}

export async function listSpecVersions(projectId: string): Promise<SpecVersion[]> {
  const { data } = await getSupabaseAdmin()
    .from("spec_versions")
    .select("id, project_id, version, spec, created_at")
    .eq("project_id", projectId)
    .order("version", { ascending: false })
    .limit(10);

  return (data ?? []).map((r: Record<string, unknown>) => ({
    id: r.id as string,
    projectId: r.project_id as string,
    version: r.version as number,
    spec: r.spec as Record<string, unknown>,
    createdAt: r.created_at as string,
  }));
}

export async function restoreSpecVersion(projectId: string, versionId: string): Promise<Record<string, unknown> | null> {
  const { data } = await getSupabaseAdmin()
    .from("spec_versions")
    .select("spec")
    .eq("id", versionId)
    .eq("project_id", projectId)
    .maybeSingle();

  if (!data) return null;

  const spec = data.spec as Record<string, unknown>;
  await getSupabaseAdmin()
    .from("projects")
    .update({ spec_override: spec, updated_at: new Date().toISOString() })
    .eq("id", projectId);

  return spec;
}
